import { useEffect, useMemo, useState } from "react";
import useAdminBranding from "../hooks/useAdminBranding";
import { INSTALLER_FALLBACK_BRANDING } from "../utils/branding";
import { BACKEND_URL } from "../config/runtime-env";

const defaultBackendUrl = BACKEND_URL;

const trimTrailingSlash = (value) => String(value || "").replace(/\/+$/g, "");

const Install = () => {
  const [form, setForm] = useState({
    backend_url: defaultBackendUrl,
    backend_port: "5001",
    admin_url: window.location.origin,
    frontend_url: "",
    db_host: "localhost",
    db_name: "mhd_belize_db",
    db_user: "root",
    db_password: "",
    admin_name: "Super Admin",
    admin_email: "admin@example.com",
    admin_password: "",
    jwt_secret: "",
    jwt_expires_in: "1d",
    node_env: "development",
    reset_database: true,
    two_factor_enforced: false,
    two_factor_pepper: "",
    smtp_host: "",
    smtp_port: "587",
    smtp_secure: false,
    smtp_user: "",
    smtp_password: "",
    smtp_from: "MHD Belize Administration <no-reply@example.gov.bz>",
  });

  const [message, setMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [installed, setInstalled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);

  const installerBaseUrl = useMemo(
    () => trimTrailingSlash(form.backend_url),
    [form.backend_url],
  );
  const branding = useAdminBranding({
    backendUrl: installerBaseUrl,
    fallback: INSTALLER_FALLBACK_BRANDING,
    useStored: false,
  });

  const handleChange = (event) => {
    const { name, type, checked, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  useEffect(() => {
    let cancelled = false;

    const checkStatus = async () => {
      if (!installerBaseUrl) return;

      setCheckingStatus(true);
      setStatusMessage("");

      try {
        const response = await fetch(`${installerBaseUrl}/install/status`);
        const data = await response.json();

        if (cancelled) return;

        setInstalled(Boolean(data.installed));
        setStatusMessage(data.message || "");
      } catch {
        if (!cancelled) {
          setStatusMessage("Unable to reach backend installer status.");
        }
      } finally {
        if (!cancelled) {
          setCheckingStatus(false);
        }
      }
    };

    checkStatus();

    return () => {
      cancelled = true;
    };
  }, [installerBaseUrl]);

  const handleInstall = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${installerBaseUrl}/install/setup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          backend_port: Number(form.backend_port),
          smtp_port: Number(form.smtp_port),
        }),
      });

      const data = await response.json();
      const details = data.details?.missing_fields?.length
        ? ` Missing fields: ${data.details.missing_fields.join(", ")}.`
        : "";

      setMessage(`${data.message || "Installer response received."}${details}`);

      if (data.status === true) {
        setInstalled(true);

        setTimeout(() => {
          window.location.href = "/login";
        }, 2000);
      }
    } catch {
      setMessage("Installation failed. Please check backend server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="install-page">
      <section className="install-panel">
        <div className="install-brand">
          {branding.logo ? (
            <img alt={branding.organizationName || branding.portalName} src={branding.logo} />
          ) : (
            <strong className="install-brand-fallback">Application Installer</strong>
          )}
        </div>

        <div className="install-header">
          <div>
            <p className="eyebrow">Administration setup</p>
            <h1>{branding.portalName || "Application Installer"}</h1>
            <p>
              Configure backend, admin panel, database, security, and first
              Super Admin account.
            </p>
          </div>
          <div
            className={`install-status ${installed ? "is-installed" : ""}`}
          >
            {checkingStatus
              ? "Checking..."
              : installed
                ? "Installed"
                : "Ready"}
          </div>
        </div>

        {statusMessage && (
          <div
            className={`install-alert ${
              installed ? "install-alert-warning" : "install-alert-info"
            }`}
          >
            {statusMessage}
          </div>
        )}

        <form className="install-form" onSubmit={handleInstall}>
          <Fieldset title="Application URLs">
            <Input
              label="Backend URL"
              name="backend_url"
              value={form.backend_url}
              onChange={handleChange}
              placeholder="http://localhost:5001"
              required
            />
            <Input
              label="Backend Port"
              name="backend_port"
              type="number"
              value={form.backend_port}
              onChange={handleChange}
              placeholder="5001"
              required
            />
            <Input
              label="Admin Panel URL"
              name="admin_url"
              value={form.admin_url}
              onChange={handleChange}
              placeholder="http://localhost:5174"
              required
            />
            <Input
              label="Public Website URL"
              name="frontend_url"
              value={form.frontend_url}
              onChange={handleChange}
              placeholder={form.node_env === "production" ? "Required for production" : "Optional; defaults to http://localhost:5173"}
              required={form.node_env === "production"}
            />
          </Fieldset>

          <Fieldset title="Database">
            <Input
              label="Database Host"
              name="db_host"
              value={form.db_host}
              onChange={handleChange}
              required
            />
            <Input
              label="Database Name"
              name="db_name"
              value={form.db_name}
              onChange={handleChange}
              required
            />
            <Input
              label="Database Username"
              name="db_user"
              value={form.db_user}
              onChange={handleChange}
              required
            />
            <Input
              label="Database Password"
              name="db_password"
              type="password"
              value={form.db_password}
              onChange={handleChange}
            />
            <Checkbox
              label="Fresh reset installer-managed tables"
              name="reset_database"
              checked={form.reset_database}
              onChange={handleChange}
            />
          </Fieldset>

          <Fieldset title="Super Admin">
            <Input
              label="Name"
              name="admin_name"
              value={form.admin_name}
              onChange={handleChange}
              required
            />
            <Input
              label="Email"
              name="admin_email"
              type="email"
              value={form.admin_email}
              onChange={handleChange}
              required
            />
            <Input
              label="Password"
              name="admin_password"
              type="password"
              value={form.admin_password}
              onChange={handleChange}
              required
            />
          </Fieldset>

          <Fieldset title="Security">
            <Input
              label="JWT Secret"
              name="jwt_secret"
              type="password"
              value={form.jwt_secret}
              onChange={handleChange}
              required
            />
            <Input
              label="JWT Expiry"
              name="jwt_expires_in"
              value={form.jwt_expires_in}
              onChange={handleChange}
              required
            />
            <Input
              label="Node Environment"
              name="node_env"
              value={form.node_env}
              onChange={handleChange}
              required
            />
            <Input
              label="Two-Factor Pepper"
              name="two_factor_pepper"
              type="password"
              value={form.two_factor_pepper}
              onChange={handleChange}
              required
            />
            <Checkbox
              label="Enforce two-factor login"
              name="two_factor_enforced"
              checked={form.two_factor_enforced}
              onChange={handleChange}
            />
          </Fieldset>

          <Fieldset title="SMTP">
            <Input
              label="SMTP Host"
              name="smtp_host"
              value={form.smtp_host}
              onChange={handleChange}
              required={form.two_factor_enforced}
            />
            <Input
              label="SMTP Port"
              name="smtp_port"
              type="number"
              value={form.smtp_port}
              onChange={handleChange}
              required={form.two_factor_enforced}
            />
            <Input
              label="SMTP User"
              name="smtp_user"
              value={form.smtp_user}
              onChange={handleChange}
            />
            <Input
              label="SMTP Password"
              name="smtp_password"
              type="password"
              value={form.smtp_password}
              onChange={handleChange}
            />
            <Input
              label="SMTP From"
              name="smtp_from"
              value={form.smtp_from}
              onChange={handleChange}
              required={form.two_factor_enforced}
            />
            <Checkbox
              label="Use SMTP secure connection"
              name="smtp_secure"
              checked={form.smtp_secure}
              onChange={handleChange}
            />
          </Fieldset>

          <button
            className="install-submit"
            type="submit"
            disabled={loading || installed}
          >
            {loading ? "Installing..." : installed ? "Installer Locked" : "Install Now"}
          </button>
        </form>

        {message && (
          <div className="install-alert install-alert-info">{message}</div>
        )}
      </section>
    </main>
  );
};

const Fieldset = ({ title, children }) => (
  <fieldset className="install-fieldset">
    <legend>{title}</legend>
    <div className="install-grid">{children}</div>
  </fieldset>
);

const Input = ({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder = "",
  required = false,
}) => (
  <label className="install-field">
    <span>{label}</span>
    <input
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
    />
  </label>
);

const Checkbox = ({ label, name, checked, onChange }) => (
  <label className="install-checkbox">
    <input
      name={name}
      type="checkbox"
      checked={checked}
      onChange={onChange}
    />
    <span>{label}</span>
  </label>
);

export default Install;
