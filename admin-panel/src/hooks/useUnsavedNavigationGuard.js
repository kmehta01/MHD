import { useCallback, useEffect } from "react";
import { useBlocker } from "react-router-dom";

const useUnsavedNavigationGuard = (dirty) => {
  const blocker = useBlocker(Boolean(dirty));

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  const keepEditing = useCallback(() => {
    if (blocker.state === "blocked") blocker.reset();
  }, [blocker]);

  const discardAndProceed = useCallback((discardChanges) => {
    if (blocker.state !== "blocked") return;
    discardChanges();
    blocker.proceed();
  }, [blocker]);

  return {
    discardAndProceed,
    keepEditing,
    open: blocker.state === "blocked",
  };
};

export default useUnsavedNavigationGuard;
