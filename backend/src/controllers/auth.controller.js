const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const path = require("path");
const { getJwtSecret } = require("../config/jwt");
const AuthModel = require("../models/auth.model");
const TwoFactorModel = require("../models/two-factor.model");
const {
  TWO_FACTOR_LIMITS,
} = require("../config/two-factor");
const SettingsPolicy = require("../services/settings-policy.service");
const { getPasswordPolicyErrors } = require("../services/password-policy.service");
const { sendLoginOtp } = require("../services/mail.service");
const { recordAuthEvent } = require("../services/auth-audit.service");
const { runAuditedMutation } = require("../services/audit-log.service");
const {
  removeUploadedFile,
  uploadRoot: profilePhotoUploadRoot,
} = require("../middlewares/profile-photo-upload.middleware");
const {
  createChallengeToken,
  generateOtp,
  generateRecoveryCodes,
  hashChallengeToken,
  hashOtp,
  hashRecoveryCode,
  maskEmail,
  normalizeRecoveryCode,
  safeHashEquals,
} = require("../services/two-factor.service");

const addSeconds = (seconds) => new Date(Date.now() + seconds * 1000);

const isChallengeExpired = (challenge) =>
  new Date(challenge.expires_at).getTime() <= Date.now();

const validateChallenge = async (challengeToken) => {
  const challengeTokenHash = hashChallengeToken(challengeToken);
  const challenge =
    await TwoFactorModel.findChallengeByTokenHash(challengeTokenHash);

  if (!challenge || challenge.used_at) {
    return {
      error: {
        statusCode: 401,
        message:
          "This verification request is invalid or has already been used",
      },
    };
  }

  if (
    challenge.status !== "active" ||
    !challenge.role_id ||
    !challenge.role_slug ||
    !challenge.role_is_active
  ) {
    await TwoFactorModel.markChallengeUsed(challenge.id);
    return {
      error: {
        statusCode: 403,
        message: "This administrator account is not available",
      },
    };
  }

  if (
    challenge.locked_at ||
    challenge.attempt_count >= TWO_FACTOR_LIMITS.maxAttempts
  ) {
    return {
      error: {
        statusCode: 429,
        message:
          "This verification request is locked. Sign in again to continue.",
      },
    };
  }

  if (isChallengeExpired(challenge)) {
    return {
      error: {
        statusCode: 410,
        message:
          "This verification code has expired. Sign in again to continue.",
      },
    };
  }

  return { challenge };
};

const createSession = async (user, twoFactorVerified, req) => {
  const settings = await SettingsPolicy.getPolicy();
  const permissions = await AuthModel.getActivePermissionsByRoleId(
    user.role_id,
  );
  const userPermissions = permissions.map((item) => item.permission_key);
  const twoFactorEnforced = settings.security.enableTwoFactorAuthentication;
  const userId = user.admin_user_id || user.id;
  const sessionToken = crypto.randomUUID();
  const sessionTimeoutMinutes = settings.security.sessionTimeoutMinutes;
  const expiresAt = new Date(Date.now() + sessionTimeoutMinutes * 60 * 1000);

  if (settings.security.restrictConcurrentLogin) {
    await AuthModel.revokeOtherAdminSessions(userId, null, "concurrent_login");
  }
  await AuthModel.createAdminSession({
    sessionToken,
    userId,
    twoFactorVerified,
    ipAddress: String(req?.ip || req?.socket?.remoteAddress || "").replace(/^::ffff:/, "").slice(0, 45) || null,
    userAgent: String(req?.get?.("user-agent") || "").slice(0, 500) || null,
    expiresAt,
  });

  const token = jwt.sign(
    {
      id: userId,
      email: user.email,
      profile_photo: user.profile_photo || null,
      role_id: user.role_id,
      role_slug: user.role_slug,
      department_id: user.department_id || null,
      permissions: userPermissions,
      two_factor_verified: twoFactorVerified,
      jti: sessionToken,
    },
    getJwtSecret(),
    {
      algorithm: "HS256",
      expiresIn: `${sessionTimeoutMinutes}m`,
    },
  );

  await AuthModel.updateLastLogin(userId);
  await AuthModel.clearFailedLogins(userId);

  return {
    token,
    user: {
      id: userId,
      name: user.name,
      email: user.email,
      profile_photo: user.profile_photo || null,
      role_id: user.role_id,
      role_name: user.role_name,
      role_slug: user.role_slug,
      department_id: user.department_id || null,
      department_name: user.department_name || null,
      permissions: userPermissions,
      two_factor_verified: twoFactorVerified,
      two_factor_enforced: twoFactorEnforced,
      password_change_required: Boolean(user.must_change_password),
    },
  };
};

const getCurrentSession = async (req, res) =>
  res.json({
    status: true,
    message: "Current session fetched successfully",
    data: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone || null,
      profile_photo: req.user.profile_photo || null,
      role_id: req.user.role_id,
      role_name: req.user.role_name,
      role_slug: req.user.role_slug,
      department_id: req.user.department_id,
      department_name: req.user.department_name,
      last_login: req.user.last_login || null,
      created_at: req.user.created_at || null,
      permissions: req.user.permissions,
      two_factor_verified: req.user.two_factor_verified === true,
      two_factor_enforced: req.user.two_factor_enforced === true,
      password_change_required: req.user.password_change_required === true,
    },
  });

const updateCurrentProfile = async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const phone = String(req.body.phone || "").trim();

    if (!name || !email) {
      return res.status(400).json({
        status: false,
        message: "Name and email are required",
      });
    }

    if (name.length > 120 || email.length > 190 || phone.length > 40) {
      return res.status(400).json({
        status: false,
        message: "One or more profile fields are too long",
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        status: false,
        message: "Enter a valid email address",
      });
    }

    if (email !== String(req.user.email).toLowerCase()) {
      return res.status(400).json({
        status: false,
        message: "Email changes must be completed by an administrator",
      });
    }

    await runAuditedMutation(
      req,
      {
        eventType: "PROFILE_UPDATED",
        resourceType: "admin_user",
        resourceId: req.user.id,
      },
      (connection) =>
        AuthModel.updateProfile(
          req.user.id,
          { name, email, phone: phone || null },
          connection,
        ),
    );

    const user = await AuthModel.findSessionUserById(req.user.id);

    return res.json({
      status: true,
      message: "Profile updated successfully",
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || null,
        profile_photo: user.profile_photo || null,
        role_id: user.role_id,
        role_name: user.role_name,
        role_slug: user.role_slug,
        department_id: user.department_id || null,
        department_name: user.department_name || null,
        permissions: req.user.permissions,
        last_login: user.last_login || null,
        created_at: user.created_at || null,
        two_factor_verified: req.user.two_factor_verified === true,
        two_factor_enforced: req.user.two_factor_enforced === true,
        password_change_required: req.user.password_change_required === true,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Failed to update profile",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const removeStoredProfilePhoto = async (storedPath) => {
  const prefix = "/uploads/profile-photos/";
  if (!storedPath?.startsWith(prefix)) return;

  const filename = path.basename(storedPath);
  await removeUploadedFile(path.join(profilePhotoUploadRoot, filename));
};

const updateCurrentProfilePhoto = async (req, res) => {
  const profilePhoto = `/uploads/profile-photos/${req.file.filename}`;
  const previousProfilePhoto = req.user.profile_photo || null;

  try {
    await runAuditedMutation(
      req,
      {
        eventType: "PROFILE_PHOTO_UPDATED",
        resourceType: "admin_user",
        resourceId: req.user.id,
      },
      (connection) =>
        AuthModel.updateProfilePhoto(req.user.id, profilePhoto, connection),
    );

    const user = await AuthModel.findSessionUserById(req.user.id);
    if (previousProfilePhoto && previousProfilePhoto !== profilePhoto) {
      await removeStoredProfilePhoto(previousProfilePhoto);
    }

    return res.json({
      status: true,
      message: "Profile picture updated successfully",
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || null,
        profile_photo: user.profile_photo || null,
        role_id: user.role_id,
        role_name: user.role_name,
        role_slug: user.role_slug,
        department_id: user.department_id || null,
        department_name: user.department_name || null,
        permissions: req.user.permissions,
        last_login: user.last_login || null,
        created_at: user.created_at || null,
        two_factor_verified: req.user.two_factor_verified === true,
        two_factor_enforced: req.user.two_factor_enforced === true,
        password_change_required: req.user.password_change_required === true,
      },
    });
  } catch (error) {
    await removeUploadedFile(req.file?.path);
    return res.status(500).json({
      status: false,
      message: "Failed to update profile picture",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const updateCurrentPassword = async (req, res) => {
  try {
    const currentPassword = String(req.body.current_password || "");
    const newPassword = String(req.body.new_password || "");

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        status: false,
        message: "Current password and new password are required",
      });
    }

    const settings = await SettingsPolicy.getPolicy();
    const passwordErrors = getPasswordPolicyErrors(newPassword, settings.security);
    if (passwordErrors.length) {
      return res.status(400).json({
        status: false,
        message: passwordErrors[0],
        errors: passwordErrors,
      });
    }

    if (currentPassword.length > 256 || newPassword.length > 128) {
      return res.status(400).json({
        status: false,
        message: "Password is too long",
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        status: false,
        message: "New password must be different from the current password",
      });
    }

    const user = await AuthModel.findPasswordById(req.user.id);
    const passwordMatches =
      user && (await bcrypt.compare(currentPassword, user.password));

    if (!passwordMatches) {
      return res.status(400).json({
        status: false,
        message: "Current password is incorrect",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await runAuditedMutation(
      req,
      {
        eventType: "PROFILE_PASSWORD_UPDATED",
        resourceType: "admin_user",
        resourceId: req.user.id,
      },
      (connection) =>
        AuthModel.updatePassword(req.user.id, hashedPassword, connection),
    );
    await AuthModel.revokeAllAdminSessions(req.user.id, "password_change");

    return res.json({
      status: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Failed to change password",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const recordInvalidCode = async (req, challenge, method) => {
  const attempt = await TwoFactorModel.recordFailedAttempt(
    challenge.id,
    TWO_FACTOR_LIMITS.maxAttempts,
  );
  const attemptCount = Number(
    attempt?.attempt_count || challenge.attempt_count + 1,
  );
  const locked = Boolean(attempt?.locked_at);

  await recordAuthEvent(req, {
    userId: challenge.admin_user_id,
    eventType: locked ? "TWO_FACTOR_LOCKED" : "TWO_FACTOR_CODE_FAILED",
    success: false,
    metadata: {
      method,
      attempt_count: attemptCount,
    },
  });

  return {
    locked,
    attemptsRemaining: Math.max(
      0,
      TWO_FACTOR_LIMITS.maxAttempts - attemptCount,
    ),
  };
};

const adminLogin = async (req, res) => {
  try {
    const settings = await SettingsPolicy.getPolicy();
    const email = String(req.body.email || "").trim();
    const password = req.body.password;

    if (!email || !password) {
      return res.status(400).json({
        status: false,
        message: "Email and password are required",
      });
    }

    const user = await AuthModel.findAdminByEmail(email);

    if (!user) {
      await recordAuthEvent(req, {
        eventType: "PASSWORD_LOGIN_FAILED",
        success: false,
        metadata: { email },
      });

      return res.status(401).json({
        status: false,
        message: "Invalid email or password",
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        status: false,
        message: "Your account is inactive. Please contact administrator.",
      });
    }

    if (user.locked_until && new Date(user.locked_until).getTime() > Date.now()) {
      return res.status(423).json({
        status: false,
        code: "ACCOUNT_LOCKED",
        message: "This account is temporarily locked. Please try again later.",
      });
    }

    if (!user.role_id || !user.role_slug || !user.role_is_active) {
      return res.status(403).json({
        status: false,
        message: "No valid role assigned to this user.",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      await AuthModel.recordFailedLogin(
        user.id,
        settings.security.maximumLoginAttempts,
        settings.security.accountLockDurationMinutes,
      );
      await recordAuthEvent(req, {
        userId: user.id,
        eventType: "PASSWORD_LOGIN_FAILED",
        success: false,
      });

      return res.status(401).json({
        status: false,
        message: "Invalid email or password",
      });
    }

    const passwordAgeDays = user.password_changed_at
      ? (Date.now() - new Date(user.password_changed_at).getTime()) / 86400000
      : Number.POSITIVE_INFINITY;
    user.must_change_password = Boolean(user.must_change_password) ||
      (settings.security.passwordExpiryDays > 0 && passwordAgeDays >= settings.security.passwordExpiryDays);

    if (!settings.security.enableTwoFactorAuthentication) {
      const session = await createSession(user, false, req);

      await recordAuthEvent(req, {
        userId: user.id,
        eventType: "PASSWORD_LOGIN_SUCCEEDED",
        metadata: { two_factor_enforced: false },
      });

      return res.status(200).json({
        status: true,
        message: "Login successful",
        requires_two_factor: false,
        ...session,
      });
    }

    if (!SettingsPolicy.isTwoFactorConfigured()) {
      return res.status(503).json({
        status: false,
        code: "TWO_FACTOR_CONFIGURATION_ERROR",
        message: "Two-factor authentication is enabled but its secure delivery service is unavailable.",
      });
    }

    const challengeToken = createChallengeToken();
    const otp = generateOtp();
    const expiresAt = addSeconds(TWO_FACTOR_LIMITS.otpTtlSeconds);
    const resendAvailableAt = addSeconds(
      TWO_FACTOR_LIMITS.resendCooldownSeconds,
    );

    const challengeResult = await TwoFactorModel.createChallenge({
      userId: user.id,
      challengeTokenHash: hashChallengeToken(challengeToken),
      otpHash: hashOtp(challengeToken, otp),
      expiresAt,
      resendAvailableAt,
    });

    try {
      await sendLoginOtp({
        email: user.email,
        name: user.name,
        otp,
        expiresInMinutes: TWO_FACTOR_LIMITS.otpTtlSeconds / 60,
      });
    } catch (mailError) {
      await TwoFactorModel.markChallengeUsed(challengeResult.insertId);
      await recordAuthEvent(req, {
        userId: user.id,
        eventType: "TWO_FACTOR_DELIVERY_FAILED",
        success: false,
        metadata: { error_code: mailError.code || "SMTP_ERROR" },
      });

      return res.status(503).json({
        status: false,
        message:
          "We could not send your verification code. Please contact ICT Support.",
      });
    }

    await recordAuthEvent(req, {
      userId: user.id,
      eventType: "TWO_FACTOR_CODE_SENT",
    });

    return res.status(200).json({
      status: true,
      message: "A verification code was sent to your email address",
      requires_two_factor: true,
      challenge_token: challengeToken,
      masked_email: maskEmail(user.email),
      expires_in: TWO_FACTOR_LIMITS.otpTtlSeconds,
      resend_available_in: TWO_FACTOR_LIMITS.resendCooldownSeconds,
    });
  } catch (error) {
    const configurationError = [
      "TWO_FACTOR_CONFIGURATION_ERROR",
      "SMTP_CONFIGURATION_ERROR",
    ].includes(error.code);

    return res.status(configurationError ? 503 : 500).json({
      status: false,
      message: configurationError
        ? "Two-factor authentication is temporarily unavailable"
        : "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const verifyTwoFactor = async (req, res) => {
  try {
    const challengeToken = String(req.body.challenge_token || "");
    const code = String(req.body.code || "").trim();
    const method = req.body.method === "recovery" ? "recovery" : "otp";

    if (!challengeToken || !code) {
      return res.status(400).json({
        status: false,
        message: "Challenge token and verification code are required",
      });
    }

    const { challenge, error } = await validateChallenge(challengeToken);

    if (error) {
      return res.status(error.statusCode).json({
        status: false,
        message: error.message,
      });
    }

    let verified = false;

    if (method === "recovery") {
      const normalizedCode = normalizeRecoveryCode(code);

      if (normalizedCode.length === 12) {
        verified = await TwoFactorModel.consumeRecoveryCodeAndChallenge({
          userId: challenge.admin_user_id,
          challengeId: challenge.id,
          codeHash: hashRecoveryCode(normalizedCode),
        });
      }
    } else {
      const normalizedOtp = code.replace(/\D/g, "");

      if (normalizedOtp.length === TWO_FACTOR_LIMITS.otpLength) {
        const submittedHash = hashOtp(challengeToken, normalizedOtp);

        if (safeHashEquals(submittedHash, challenge.otp_hash)) {
          verified = await TwoFactorModel.consumeOtpChallenge(
            challenge.id,
            submittedHash,
          );
        }
      }
    }

    if (!verified) {
      const failure = await recordInvalidCode(req, challenge, method);

      return res.status(failure.locked ? 429 : 401).json({
        status: false,
        message: failure.locked
          ? "Too many incorrect codes. Sign in again to continue."
          : "The verification code is incorrect",
        attempts_remaining: failure.attemptsRemaining,
      });
    }

    let recoveryCodes;
    const existingRecoveryCodeCount = await TwoFactorModel.countRecoveryCodes(
      challenge.admin_user_id,
    );

    if (existingRecoveryCodeCount === 0) {
      recoveryCodes = generateRecoveryCodes();
      await TwoFactorModel.replaceRecoveryCodes({
        userId: challenge.admin_user_id,
        codeHashes: recoveryCodes.map(hashRecoveryCode),
      });

      await recordAuthEvent(req, {
        userId: challenge.admin_user_id,
        eventType: "TWO_FACTOR_RECOVERY_CODES_ISSUED",
      });
    }

      const session = await createSession(challenge, true, req);

    await recordAuthEvent(req, {
      userId: challenge.admin_user_id,
      eventType:
        method === "recovery"
          ? "TWO_FACTOR_RECOVERY_CODE_USED"
          : "TWO_FACTOR_VERIFIED",
      metadata: { method },
    });

    return res.status(200).json({
      status: true,
      message: "Login successful",
      requires_two_factor: false,
      ...session,
      recovery_codes: recoveryCodes,
      must_acknowledge_recovery_codes: Boolean(recoveryCodes),
    });
  } catch (error) {
    const configurationError = error.code === "TWO_FACTOR_CONFIGURATION_ERROR";

    return res.status(configurationError ? 503 : 500).json({
      status: false,
      message: configurationError
        ? "Two-factor authentication is temporarily unavailable"
        : "Failed to verify the code",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const logout = async (req, res) => {
  try {
    if (req.user?.jti) await AuthModel.revokeAdminSession(req.user.jti, "logout");
    return res.json({ status: true, message: "Signed out successfully" });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Failed to sign out",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const resendTwoFactorCode = async (req, res) => {
  try {
    const challengeToken = String(req.body.challenge_token || "");

    if (!challengeToken) {
      return res.status(400).json({
        status: false,
        message: "Challenge token is required",
      });
    }

    const { challenge, error } = await validateChallenge(challengeToken);

    if (error) {
      return res.status(error.statusCode).json({
        status: false,
        message: error.message,
      });
    }

    if (challenge.resend_count >= TWO_FACTOR_LIMITS.maxResends) {
      return res.status(429).json({
        status: false,
        message: "The maximum number of replacement codes has been reached",
      });
    }

    const resendAvailableAt = new Date(challenge.resend_available_at).getTime();
    const waitSeconds = Math.max(
      0,
      Math.ceil((resendAvailableAt - Date.now()) / 1000),
    );

    if (waitSeconds > 0) {
      return res.status(429).json({
        status: false,
        message: `Please wait ${waitSeconds} seconds before requesting another code`,
        resend_available_in: waitSeconds,
      });
    }

    const otp = generateOtp();
    const expiresAt = addSeconds(TWO_FACTOR_LIMITS.otpTtlSeconds);
    const nextResendAt = addSeconds(TWO_FACTOR_LIMITS.resendCooldownSeconds);
    const rotated = await TwoFactorModel.rotateChallengeOtp({
      challengeId: challenge.id,
      otpHash: hashOtp(challengeToken, otp),
      expiresAt,
      resendAvailableAt: nextResendAt,
      maxResends: TWO_FACTOR_LIMITS.maxResends,
    });

    if (!rotated) {
      return res.status(409).json({
        status: false,
        message: "The verification request changed. Please try again.",
      });
    }

    try {
      await sendLoginOtp({
        email: challenge.email,
        name: challenge.name,
        otp,
        expiresInMinutes: TWO_FACTOR_LIMITS.otpTtlSeconds / 60,
      });
    } catch (mailError) {
      await TwoFactorModel.markChallengeUsed(challenge.id);
      await recordAuthEvent(req, {
        userId: challenge.admin_user_id,
        eventType: "TWO_FACTOR_DELIVERY_FAILED",
        success: false,
        metadata: {
          resend: true,
          error_code: mailError.code || "SMTP_ERROR",
        },
      });

      return res.status(503).json({
        status: false,
        message:
          "We could not send another code. Please sign in again or contact ICT Support.",
      });
    }

    await recordAuthEvent(req, {
      userId: challenge.admin_user_id,
      eventType: "TWO_FACTOR_CODE_RESENT",
      metadata: { resend_count: challenge.resend_count + 1 },
    });

    return res.json({
      status: true,
      message: "A new verification code was sent",
      masked_email: maskEmail(challenge.email),
      expires_in: TWO_FACTOR_LIMITS.otpTtlSeconds,
      resend_available_in: TWO_FACTOR_LIMITS.resendCooldownSeconds,
      resends_remaining:
        TWO_FACTOR_LIMITS.maxResends - (challenge.resend_count + 1),
    });
  } catch (error) {
    const configurationError = [
      "TWO_FACTOR_CONFIGURATION_ERROR",
      "SMTP_CONFIGURATION_ERROR",
    ].includes(error.code);

    return res.status(configurationError ? 503 : 500).json({
      status: false,
      message: configurationError
        ? "Two-factor authentication is temporarily unavailable"
        : "Failed to resend the verification code",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
  adminLogin,
  getCurrentSession,
  logout,
  resendTwoFactorCode,
  updateCurrentPassword,
  updateCurrentProfilePhoto,
  updateCurrentProfile,
  verifyTwoFactor,
};
