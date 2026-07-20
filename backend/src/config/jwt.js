const MINIMUM_JWT_SECRET_LENGTH = 32;
const PLACEHOLDER_SECRET_PATTERN =
  /(?:change|example|replace|sample|test)[-_ ]*(?:me|this|secret|value)?/i;

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;

  if (
    typeof secret !== "string" ||
    secret.length < MINIMUM_JWT_SECRET_LENGTH ||
    PLACEHOLDER_SECRET_PATTERN.test(secret)
  ) {
    const error = new Error(
      "JWT_SECRET must be a unique, non-placeholder secret of at least 32 characters",
    );
    error.code = "JWT_CONFIGURATION_ERROR";
    throw error;
  }

  return secret;
};

module.exports = { getJwtSecret, MINIMUM_JWT_SECRET_LENGTH };
