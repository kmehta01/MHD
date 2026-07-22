import { useEffect, useMemo, useState } from "react";
import {
  applyDocumentBranding,
  DEFAULT_ADMIN_BRANDING,
  loadPublicBranding,
  readStoredBranding,
  storeBranding,
} from "../utils/branding";

const useAdminBranding = ({ backendUrl, fallback = DEFAULT_ADMIN_BRANDING, useStored = true } = {}) => {
  const requestKey = `${backendUrl || "default"}:${useStored ? "stored" : "fallback"}`;
  const initialBranding = useMemo(
    () => useStored ? readStoredBranding() : fallback,
    [fallback, useStored],
  );
  const [resolved, setResolved] = useState(() => ({
    branding: initialBranding,
    requestKey,
  }));
  const branding = resolved.requestKey === requestKey
    ? resolved.branding
    : initialBranding;

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const immediateBranding = useStored ? readStoredBranding() : fallback;
    applyDocumentBranding(immediateBranding);

    loadPublicBranding({ backendUrl, fallback, signal: controller.signal })
      .then((nextBranding) => {
        if (!active) return;
        setResolved({ branding: nextBranding, requestKey });
        storeBranding(nextBranding);
        applyDocumentBranding(nextBranding);
      })
      .catch(() => {
        // Branding is optional; authentication and installation remain available.
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [backendUrl, fallback, requestKey, useStored]);

  return branding;
};

export default useAdminBranding;
