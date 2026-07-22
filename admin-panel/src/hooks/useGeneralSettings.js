import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getGeneralSettings,
  resetGeneralSettings,
  updateGeneralSettings,
  uploadGeneralSettingsAsset,
} from "../services/settingsApi";

const clone = (value) => JSON.parse(JSON.stringify(value));
const publishBranding = (settings) => {
  if (!settings?.organization) return;
  window.dispatchEvent(new CustomEvent("general-settings-branding-updated", {
    detail: settings,
  }));
};

const useGeneralSettings = () => {
  const [settings, setSettings] = useState(null);
  const [savedSettings, setSavedSettings] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAsset, setUploadingAsset] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await getGeneralSettings();
      setSettings(clone(response.data.data));
      setSavedSettings(clone(response.data.data));
      setMeta(response.data.meta || null);
      publishBranding(response.data.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load General Settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const dirty = useMemo(
    () => Boolean(settings && savedSettings && JSON.stringify(settings) !== JSON.stringify(savedSettings)),
    [savedSettings, settings],
  );

  const updateField = useCallback((group, key, value) => {
    setSettings((current) => ({
      ...current,
      [group]: { ...current[group], [key]: value },
    }));
    setFieldErrors((current) => {
      if (!current[`${group}.${key}`]) return current;
      const next = { ...current };
      delete next[`${group}.${key}`];
      return next;
    });
  }, []);

  const save = useCallback(async (reason = "") => {
    try {
      setSaving(true);
      setError("");
      setFieldErrors({});
      const response = await updateGeneralSettings(settings, reason);
      setSettings(clone(response.data.data));
      setSavedSettings(clone(response.data.data));
      setMeta(response.data.meta || meta);
      publishBranding(response.data.data);
      return { ok: true, message: response.data.message };
    } catch (requestError) {
      setFieldErrors(requestError.response?.data?.errors || {});
      setError(requestError.response?.data?.message || "Unable to save General Settings.");
      return { ok: false, message: requestError.response?.data?.message };
    } finally {
      setSaving(false);
    }
  }, [meta, settings]);

  const uploadAsset = useCallback(async (assetType, file) => {
    try {
      setUploadingAsset(assetType);
      setError("");
      const response = await uploadGeneralSettingsAsset(assetType, file);
      setSettings(clone(response.data.data));
      setSavedSettings(clone(response.data.data));
      setMeta(response.data.meta || meta);
      publishBranding(response.data.data);
      return { ok: true, message: response.data.message };
    } catch (requestError) {
      const message = requestError.response?.data?.message || `Unable to upload the ${assetType}.`;
      setError(message);
      return { ok: false, message };
    } finally {
      setUploadingAsset("");
    }
  }, [meta]);

  const restoreDefaults = useCallback(async (confirmation, reason) => {
    try {
      setSaving(true);
      setError("");
      setFieldErrors({});
      const response = await resetGeneralSettings(confirmation, reason);
      setSettings(clone(response.data.data));
      setSavedSettings(clone(response.data.data));
      setMeta(response.data.meta || meta);
      publishBranding(response.data.data);
      return { ok: true, message: response.data.message };
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Unable to restore default settings.";
      setFieldErrors(requestError.response?.data?.errors || {});
      setError(message);
      return { ok: false, message };
    } finally {
      setSaving(false);
    }
  }, [meta]);

  const discardChanges = useCallback(() => {
    setSettings(clone(savedSettings));
    setFieldErrors({});
    setError("");
  }, [savedSettings]);

  return {
    dirty,
    discardChanges,
    error,
    fieldErrors,
    load,
    loading,
    meta,
    restoreDefaults,
    save,
    savedSettings,
    saving,
    settings,
    updateField,
    uploadAsset,
    uploadingAsset,
  };
};

export default useGeneralSettings;
