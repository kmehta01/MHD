import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import useAdminBranding from "../hooks/useAdminBranding";

const RecoveryCodes = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const branding = useAdminBranding();
  const [recoveryCodes] = useState(
    () => location.state?.recoveryCodes || [],
  );
  const [acknowledged, setAcknowledged] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (recoveryCodes.length === 0) {
      navigate("/dashboard", { replace: true });
      return;
    }

    navigate("/recovery-codes", { replace: true, state: null });
  }, [navigate, recoveryCodes.length]);

  const copyCodes = async () => {
    await navigator.clipboard.writeText(recoveryCodes.join("\n"));
    setCopied(true);
  };

  if (recoveryCodes.length === 0) return null;

  return (
    <main className="recovery-page">
      <section className="recovery-card">
        <div className="recovery-logo-shell">
          <img
            alt={branding.organizationName || branding.portalName}
            src={branding.logo}
          />
        </div>
        <span className="recovery-icon">
          <Icon name="key" size={28} />
        </span>
        <p className="eyebrow">Account recovery</p>
        <h1>Store your recovery codes</h1>
        <p className="recovery-intro">
          Each code can replace an email verification code once. They will not
          be displayed again after you leave this page.
        </p>

        <div className="recovery-code-grid">
          {recoveryCodes.map((code) => (
            <code key={code}>{code}</code>
          ))}
        </div>

        <button className="button button-secondary recovery-copy" onClick={copyCodes} type="button">
          <Icon name={copied ? "check" : "download"} size={17} />
          {copied ? "Copied" : "Copy all codes"}
        </button>

        <label className="recovery-acknowledgement">
          <input
            checked={acknowledged}
            onChange={(event) => setAcknowledged(event.target.checked)}
            type="checkbox"
          />
          <span>I have stored these codes in a secure location.</span>
        </label>

        <button
          className="button button-primary recovery-continue"
          disabled={!acknowledged}
          onClick={() => navigate("/dashboard", { replace: true })}
          type="button"
        >
          Continue to dashboard <Icon name="arrowRight" size={17} />
        </button>
      </section>
    </main>
  );
};

export default RecoveryCodes;
