import { useEffect, useRef } from "react";

const SCRIPT_ID = "google-recaptcha-v2";

function RecaptchaCheckbox({ onChange, resetVersion = 0, siteKey }) {
  const containerRef = useRef(null);
  const widgetRef = useRef(null);
  const lastResetVersionRef = useRef(resetVersion);

  useEffect(() => {
    let active = true;
    const render = () => {
      if (!active || !containerRef.current || !window.grecaptcha || widgetRef.current !== null) return;
      widgetRef.current = window.grecaptcha.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token) => onChange(token),
        "expired-callback": () => onChange(""),
        "error-callback": () => onChange(""),
      });
    };

    const existing = document.getElementById(SCRIPT_ID);
    if (window.grecaptcha) {
      window.grecaptcha.ready(render);
    } else if (existing) {
      existing.addEventListener("load", render, { once: true });
    } else {
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = "https://www.google.com/recaptcha/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.addEventListener("load", render, { once: true });
      document.head.appendChild(script);
    }

    return () => {
      active = false;
      if (widgetRef.current !== null && window.grecaptcha) {
        window.grecaptcha.reset(widgetRef.current);
      }
      widgetRef.current = null;
    };
  }, [onChange, siteKey]);

  useEffect(() => {
    if (lastResetVersionRef.current === resetVersion) return;
    lastResetVersionRef.current = resetVersion;
    if (widgetRef.current !== null && window.grecaptcha) {
      window.grecaptcha.reset(widgetRef.current);
      onChange("");
    }
  }, [onChange, resetVersion]);

  return <div className="grievance-captcha" ref={containerRef} />;
}

export default RecaptchaCheckbox;
