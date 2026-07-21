const SettingsPolicy = require("./settings-policy.service");

const getPasswordPolicyErrors = (password, security) => {
  const errors = [];
  if (typeof password !== "string") return ["Password must be text"];
  if (password.length < security.minimumPasswordLength) {
    errors.push(`Password must be at least ${security.minimumPasswordLength} characters long`);
  }
  if (password.length > 128) errors.push("Password must be 128 characters or fewer");
  if (security.requireUppercase && !/[A-Z]/.test(password)) errors.push("Password must include an uppercase letter");
  if (security.requireLowercase && !/[a-z]/.test(password)) errors.push("Password must include a lowercase letter");
  if (security.requireNumber && !/\d/.test(password)) errors.push("Password must include a number");
  if (security.requireSpecialCharacter && !/[^A-Za-z0-9]/.test(password)) errors.push("Password must include a special character");
  return errors;
};

const validatePassword = async (password) => {
  const settings = await SettingsPolicy.getPolicy();
  return {
    errors: getPasswordPolicyErrors(password, settings.security),
    policy: settings.security,
  };
};

module.exports = { getPasswordPolicyErrors, validatePassword };
