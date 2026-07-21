import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getTicketNumberSettings, previewTicketNumber, resetTicketSequence,
  updateTicketNumberSettings,
} from "../services/ticketSettingsApi";

const editableKeys = [
  "autoGenerate", "ticketPrefix", "ticketFormat", "separator", "letterCase",
  "includeYear", "yearFormat", "includeMonth", "includeDay",
  "includeDepartmentCode", "includeLocationCode", "includeCategoryCode",
  "sequenceLength", "startingSequence", "sequenceReset", "sequencePadding",
];
const clone = (value) => JSON.parse(JSON.stringify(value));
const editable = (data) => Object.fromEntries(editableKeys.map((key) => [key, data[key]]));

const useTicketNumberSettings = () => {
  const [settings, setSettings] = useState(null);
  const [savedSettings, setSavedSettings] = useState(null);
  const [sequence, setSequence] = useState(null);
  const [meta, setMeta] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");

  const acceptData = useCallback((data, responseMeta) => {
    const form = editable(data);
    setSettings(clone(form));
    setSavedSettings(clone(form));
    setSequence(data);
    if (responseMeta) setMeta(responseMeta);
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true); setError("");
      const response = await getTicketNumberSettings();
      acceptData(response.data.data, response.data.meta);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load Ticket Number Format settings.");
    } finally { setLoading(false); }
  }, [acceptData]);

  useEffect(() => { const timer = window.setTimeout(load, 0); return () => window.clearTimeout(timer); }, [load]);
  useEffect(() => {
    if (!settings) return undefined;
    const timer = window.setTimeout(async () => {
      try {
        setPreviewing(true);
        const response = await previewTicketNumber(settings);
        setPreview(response.data.data); setFieldErrors({});
      } catch (requestError) {
        setPreview(null);
        setFieldErrors(requestError.response?.data?.errors || {});
      } finally { setPreviewing(false); }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [settings]);

  const dirty = useMemo(() => Boolean(settings && savedSettings && JSON.stringify(settings) !== JSON.stringify(savedSettings)), [savedSettings, settings]);
  const updateField = useCallback((key, value) => {
    setSettings((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => { const next = { ...current }; delete next[key]; return next; });
  }, []);
  const discardChanges = useCallback(() => { setSettings(clone(savedSettings)); setFieldErrors({}); setError(""); }, [savedSettings]);

  const save = useCallback(async (reason) => {
    try {
      setSaving(true); setError(""); setFieldErrors({});
      const response = await updateTicketNumberSettings(settings, reason);
      acceptData(response.data.data, response.data.meta || meta);
      setPreview(response.data.preview);
      return { ok: true, message: [response.data.message, ...(response.data.warnings || [])].join(" ") };
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Unable to save Ticket Number Format settings.";
      setError(message); setFieldErrors(requestError.response?.data?.errors || {});
      return { ok: false, message };
    } finally { setSaving(false); }
  }, [acceptData, meta, settings]);

  const resetSequence = useCallback(async (payload) => {
    try {
      setSaving(true); setError("");
      const response = await resetTicketSequence(payload);
      acceptData(response.data.data, meta);
      return { ok: true, message: response.data.message, nextTicket: response.data.nextTicket };
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Unable to reset the ticket sequence.";
      setError(message);
      return { ok: false, message, errors: requestError.response?.data?.errors || {} };
    } finally { setSaving(false); }
  }, [acceptData, meta]);

  return { dirty, discardChanges, error, fieldErrors, load, loading, meta, preview, previewing, resetSequence, save, saving, sequence, settings, updateField };
};

export default useTicketNumberSettings;
