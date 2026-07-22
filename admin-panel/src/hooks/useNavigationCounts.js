import { useEffect, useState } from "react";
import API from "../services/api";

const useNavigationCounts = (enabled, refreshMilliseconds = 30000) => {
  const [counts, setCounts] = useState({});

  useEffect(() => {
    if (!enabled) return undefined;
    let active = true;
    const load = () => {
      API.get("/complaints/navigation-counts")
        .then((response) => {
          if (active) setCounts(response.data.data || {});
        })
        .catch(() => {
          // Preserve the last successful counts while the API is unavailable.
        });
    };
    const initialTimer = window.setTimeout(load, 0);
    const interval = window.setInterval(load, refreshMilliseconds);
    window.addEventListener("focus", load);
    return () => {
      active = false;
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
      window.removeEventListener("focus", load);
    };
  }, [enabled, refreshMilliseconds]);

  return counts;
};

export default useNavigationCounts;
