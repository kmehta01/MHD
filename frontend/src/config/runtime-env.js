const DEVELOPMENT_URLS = {
  api: "http://localhost:5001/api",
};

const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === "test";
const runtimeEnvironment = {
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  VITE_BACKEND_URL: import.meta.env.VITE_BACKEND_URL,
};
const trimTrailingSlash = (value) => String(value || "").trim().replace(/\/+$/, "");

const configuredUrl = (name, developmentFallback, { allowRootRelative = false } = {}) => {
  const value = trimTrailingSlash(runtimeEnvironment[name]);
  const resolved = value || (isDevelopment ? developmentFallback : "");
  if (!resolved) throw new Error(`${name} is required.`);
  if (allowRootRelative && resolved.startsWith("/") && !resolved.startsWith("//")) {
    if (resolved === "/") throw new Error(`${name} must include an API path.`);
    return resolved;
  }
  const url = new URL(resolved);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error(`${name} must use HTTP or HTTPS.`);
  return resolved;
};

export const API_BASE_URL = configuredUrl("VITE_API_BASE_URL", DEVELOPMENT_URLS.api, { allowRootRelative: true });
export const BACKEND_URL = runtimeEnvironment.VITE_BACKEND_URL
  ? configuredUrl("VITE_BACKEND_URL", "")
  : new URL(API_BASE_URL, window.location.origin).origin;
