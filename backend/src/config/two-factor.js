const TWO_FACTOR_LIMITS = Object.freeze({
  otpLength: 6,
  otpTtlSeconds: 5 * 60,
  maxAttempts: 5,
  resendCooldownSeconds: 60,
  maxResends: 3,
  recoveryCodeCount: 10,
});

const isTwoFactorEnforced = () =>
  String(process.env.TWO_FACTOR_ENFORCED).toLowerCase() === "true";

module.exports = {
  TWO_FACTOR_LIMITS,
  isTwoFactorEnforced,
};
