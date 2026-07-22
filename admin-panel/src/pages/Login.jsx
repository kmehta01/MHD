import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import useAdminBranding from "../hooks/useAdminBranding";
import API from "../services/api";

const Login = () => {
  const navigate = useNavigate();
  const branding = useAdminBranding();
  const [step, setStep] = useState("credentials");
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [challenge, setChallenge] = useState(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationMethod, setVerificationMethod] = useState("otp");
  const [resendSeconds, setResendSeconds] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (step !== "verify" || resendSeconds <= 0) return undefined;

    const timer = window.setInterval(() => {
      setResendSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendSeconds, step]);

  const completeLogin = (data) => {
    localStorage.setItem("admin_token", data.token);
    localStorage.setItem("admin_user", JSON.stringify(data.user));

    if (data.must_acknowledge_recovery_codes && data.recovery_codes?.length) {
      navigate("/recovery-codes", {
        replace: true,
        state: { recoveryCodes: data.recovery_codes },
      });
      return;
    }

    if (data.user?.password_change_required) {
      navigate("/profile", { replace: true });
      return;
    }

    navigate("/dashboard", { replace: true });
  };

  const handleChange = (event) => {
    setFormData((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
    setError("");
  };

  const handleCredentialsSubmit = async (event) => {
    event.preventDefault();

    if (!formData.email || !formData.password) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);
      const response = await API.post("/auth/login", formData);

      if (response.data.requires_two_factor) {
        setChallenge({
          token: response.data.challenge_token,
          maskedEmail: response.data.masked_email,
          expiresIn: response.data.expires_in,
        });
        setResendSeconds(response.data.resend_available_in || 60);
        setStep("verify");
        setVerificationCode("");
        return;
      }

      completeLogin(response.data);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "We could not sign you in. Please check your details and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationSubmit = async (event) => {
    event.preventDefault();

    if (!verificationCode.trim()) {
      setError(
        verificationMethod === "otp"
          ? "Enter the six-digit code from your email."
          : "Enter one of your recovery codes.",
      );
      return;
    }

    try {
      setLoading(true);
      const response = await API.post("/auth/2fa/verify", {
        challenge_token: challenge.token,
        code: verificationCode,
        method: verificationMethod,
      });

      completeLogin(response.data);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "The verification code could not be confirmed.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendSeconds > 0 || loading) return;

    try {
      setLoading(true);
      setError("");
      const response = await API.post("/auth/2fa/resend", {
        challenge_token: challenge.token,
      });

      setResendSeconds(response.data.resend_available_in || 60);
      setVerificationCode("");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "We could not send another verification code.",
      );
      setResendSeconds(
        requestError.response?.data?.resend_available_in || 0,
      );
    } finally {
      setLoading(false);
    }
  };

  const restartLogin = () => {
    setStep("credentials");
    setChallenge(null);
    setVerificationCode("");
    setVerificationMethod("otp");
    setResendSeconds(0);
    setError("");
  };

  const showRecoveryInput = verificationMethod === "recovery";

  return (
    <main className="login-page">
      <section className="login-brand-panel">
        <div className="login-brand-top">
          <div className="brand-logo-shell login-logo-shell">
            <img
              alt={branding.organizationName || branding.portalName}
              className="brand-logo"
              src={branding.logo}
            />
          </div>
        </div>

        <div className="login-brand-content">
          <p className="eyebrow">{branding.portalName} Administration</p>
          <h1>{branding.portalSubtitle || "Administration Portal"}</h1>
          <p>
            Securely manage {branding.organizationName || "organization"} digital
            services and public information.
          </p>
          <div className="login-trust-list">
            <span>
              <Icon name="shieldCheck" size={20} /> Protected system
            </span>
            <span>
              <Icon name="audit" size={20} /> Full activity auditing
            </span>
            <span>
              <Icon name="lock" size={20} /> Role-based secure access
            </span>
          </div>
        </div>

        <div className="login-brand-footer">
          {branding.copyrightYear && branding.footerText ? (
            <span>&copy; {branding.copyrightYear} {branding.footerText}</span>
          ) : null}
          <span>Authorized personnel only</span>
        </div>
        <div className="login-pattern" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </section>

      <section className="login-form-panel">
        <div className="login-mobile-brand">
          <div className="brand-logo-shell login-mobile-logo-shell">
            <img
              alt={branding.organizationName || branding.portalName}
              className="brand-logo"
              src={branding.logo}
            />
          </div>
        </div>

        <div className="login-card">
          <div className="login-heading">
            <span className="login-lock-icon">
              <Icon name={step === "verify" ? "key" : "lock"} size={20} />
            </span>
            <div>
              <p className="eyebrow">Secure access</p>
              <h2>{step === "verify" ? "Verify your identity" : "Welcome back"}</h2>
            </div>
          </div>
          <p className="login-intro">
            {step === "verify"
              ? `Enter the code sent to ${challenge?.maskedEmail}.`
              : "Sign in with your administrator account to continue."}
          </p>

          {error ? (
            <div className="login-error" role="alert">
              <Icon name="alert" size={17} />
              <span>{error}</span>
            </div>
          ) : null}

          {step === "credentials" ? (
            <form className="login-form" onSubmit={handleCredentialsSubmit}>
              <label className="login-field">
                <span>Email</span>
                <div>
                  <Icon name="contact" size={17} />
                  <input
                    autoComplete="email"
                    name="email"
                    onChange={handleChange}
                    placeholder="Enter your email address"
                    type="email"
                    value={formData.email}
                  />
                </div>
              </label>

              <label className="login-field">
                <span>Password</span>
                <div>
                  <Icon name="lock" size={17} />
                  <input
                    autoComplete="current-password"
                    name="password"
                    onChange={handleChange}
                    placeholder="Enter your password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                  />
                  <button
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((current) => !current)}
                    type="button"
                  >
                    <Icon name="eye" size={17} />
                  </button>
                </div>
              </label>

              <div className="login-single-option">
                <button type="button">Forgot password?</button>
              </div>

              <button className="login-submit" disabled={loading} type="submit">
                {loading ? (
                  <span className="button-spinner" />
                ) : (
                  <Icon name="shieldCheck" size={22} />
                )}
                {loading ? "Verifying credentials..." : "Sign in securely"}
                {!loading ? <Icon name="arrowRight" size={18} /> : null}
              </button>
            </form>
          ) : (
            <form className="login-form" onSubmit={handleVerificationSubmit}>
              <div className="verification-summary">
                <Icon name="contact" size={18} />
                <div>
                  <strong>Check your email</strong>
                  <span>
                    The code expires in{" "}
                    {Math.round((challenge?.expiresIn || 300) / 60)} minutes.
                  </span>
                </div>
              </div>

              <label className="login-field verification-field">
                <span>
                  {showRecoveryInput
                    ? "Recovery code"
                    : "Six-digit verification code"}
                </span>
                <div>
                  <Icon name="key" size={17} />
                  <input
                    autoComplete={
                      showRecoveryInput ? "off" : "one-time-code"
                    }
                    autoFocus
                    inputMode={showRecoveryInput ? "text" : "numeric"}
                    maxLength={showRecoveryInput ? 14 : 6}
                    onChange={(event) => {
                      const value = showRecoveryInput
                        ? event.target.value.toUpperCase()
                        : event.target.value.replace(/\D/g, "");
                      setVerificationCode(value);
                      setError("");
                    }}
                    placeholder={
                      showRecoveryInput ? "XXXX-XXXX-XXXX" : "000000"
                    }
                    value={verificationCode}
                  />
                </div>
              </label>

              <div className="verification-actions">
                <button
                  onClick={() => {
                    setVerificationMethod((current) =>
                      current === "otp" ? "recovery" : "otp",
                    );
                    setVerificationCode("");
                    setError("");
                  }}
                  type="button"
                >
                  {showRecoveryInput
                    ? "Use an email code"
                    : "Use a recovery code"}
                </button>
                {!showRecoveryInput ? (
                  <button
                    disabled={resendSeconds > 0 || loading}
                    onClick={handleResend}
                    type="button"
                  >
                    {resendSeconds > 0
                      ? `Resend in ${resendSeconds}s`
                      : "Resend code"}
                  </button>
                ) : null}
              </div>

              <button className="login-submit" disabled={loading} type="submit">
                {loading ? (
                  <span className="button-spinner" />
                ) : (
                  <Icon name="shieldCheck" size={18} />
                )}
                {loading ? "Checking code..." : "Verify and continue"}
                {!loading ? <Icon name="arrowRight" size={17} /> : null}
              </button>

              <button
                className="login-back-button"
                onClick={restartLogin}
                type="button"
              >
                Back to sign in
              </button>
            </form>
          )}

          <div className="login-security-note">
            <Icon name="shieldCheck" size={22} />
            <p>
              <strong>Your connection is secure</strong>
              <span>
                Administrator sessions are protected with email verification.
              </span>
            </p>
          </div>
        </div>

        <div className="login-help">
          <span>Having trouble signing in?</span>
          <button type="button">Contact ICT Support</button>
        </div>
      </section>
    </main>
  );
};

export default Login;
