const HTTP_PROTOCOLS = new Set(["http:", "https:"]);

const isRootRelative = (value) => value.startsWith("/") && !value.startsWith("//");

export const validateConfiguredUrl = (name, value, { allowRootRelative = false } = {}) => {
  const normalized = String(value || "").trim();
  if (!normalized) throw new Error(`${name} is required for production builds.`);
  if (allowRootRelative && isRootRelative(normalized)) {
    if (normalized === "/") throw new Error(`${name} must include an API path.`);
    return normalized;
  }

  let url;
  try {
    url = new URL(normalized);
  } catch {
    throw new Error(`${name} must be a valid HTTP(S) URL${allowRootRelative ? " or root-relative path" : ""}.`);
  }
  if (!HTTP_PROTOCOLS.has(url.protocol)) throw new Error(`${name} must use HTTP or HTTPS.`);
  return normalized;
};

export const validateViteBuildEnvironment = ({ appName, command, env, required }) => {
  if (command !== "build") return;
  const errors = [];
  for (const item of required) {
    try {
      validateConfiguredUrl(item.name, env[item.name], item);
    } catch (error) {
      errors.push(error.message);
    }
  }
  if (env.VITE_BACKEND_URL) {
    try {
      validateConfiguredUrl("VITE_BACKEND_URL", env.VITE_BACKEND_URL);
    } catch (error) {
      errors.push(error.message);
    }
  }
  if (errors.length) {
    throw new Error(`${appName} environment configuration failed:\n- ${errors.join("\n- ")}`);
  }
};
