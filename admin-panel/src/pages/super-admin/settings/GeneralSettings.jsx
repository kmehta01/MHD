import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardPreview from "../../../components/settings/DashboardPreview";
import FileUploadPreview from "../../../components/settings/FileUploadPreview";
import SettingToggle from "../../../components/settings/SettingToggle";
import SettingsHistoryModal from "../../../components/settings/SettingsHistoryModal";
import SettingsSection from "../../../components/settings/SettingsSection";
import SettingsSidebar from "../../../components/settings/SettingsSidebar";
import TicketPreview from "../../../components/settings/TicketPreview";
import UnsavedChangesModal from "../../../components/settings/UnsavedChangesModal";
import Icon from "../../../components/Icon";
import useGeneralSettings from "../../../hooks/useGeneralSettings";
import { settingLabels, settingsSections } from "./settingsConfig";

const formatUpdatedAt = (value) => {
  if (!value) return "Not updated yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not updated yet";
  return new Intl.DateTimeFormat("en-BZ", { dateStyle: "medium", timeStyle: "short" }).format(date);
};

const GeneralSettings = () => {
  const navigate = useNavigate();
  const {
    dirty, discardChanges, error, fieldErrors, load, loading, meta,
    restoreDefaults, save, saving, settings, updateField, uploadAsset,
    uploadingAsset,
  } = useGeneralSettings();
  const [activeSection, setActiveSection] = useState("organization");
  const [search, setSearch] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetConfirmation, setResetConfirmation] = useState("");
  const [resetReason, setResetReason] = useState("");
  const [resetError, setResetError] = useState("");
  const [changeReason, setChangeReason] = useState("");
  const [maintenancePending, setMaintenancePending] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState("");
  const [toast, setToast] = useState(null);

  const capabilities = meta?.capabilities || {};
  const readOnly = Boolean(capabilities.read_only);
  const normalizedSearch = search.trim().toLowerCase();
  const visibleSections = useMemo(() => settingsSections
    .map((section) => ({
      ...section,
      fields: normalizedSearch
        ? section.fields.filter((field) =>
            `${section.title} ${section.description} ${field.label}`.toLowerCase().includes(normalizedSearch))
        : section.fields,
    }))
    .filter((section) => !normalizedSearch || section.fields.length), [normalizedSearch]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const closeTopDialog = (event) => {
      if (event.key !== "Escape" || saving) return;
      if (resetOpen) setResetOpen(false);
      else if (maintenancePending) setMaintenancePending(false);
      else if (historyOpen) setHistoryOpen(false);
      else if (leaveOpen) setLeaveOpen(false);
    };
    document.addEventListener("keydown", closeTopDialog);
    return () => document.removeEventListener("keydown", closeTopDialog);
  }, [historyOpen, leaveOpen, maintenancePending, resetOpen, saving]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    const interceptNavigation = (event) => {
      if (!dirty || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target.closest?.("a[href]");
      if (!anchor || anchor.target === "_blank") return;
      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin || destination.pathname === window.location.pathname) return;
      event.preventDefault();
      event.stopPropagation();
      setPendingHref(`${destination.pathname}${destination.search}${destination.hash}`);
      setLeaveOpen(true);
    };
    document.addEventListener("click", interceptNavigation, true);
    return () => document.removeEventListener("click", interceptNavigation, true);
  }, [dirty]);

  useEffect(() => {
    if (loading || normalizedSearch) return undefined;
    const elements = settingsSections
      .map((section) => document.getElementById(`settings-${section.id}`))
      .filter(Boolean);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveSection(visible.target.id.replace("settings-", ""));
      },
      { rootMargin: "-120px 0px -55% 0px", threshold: [0.1, 0.35, 0.7] },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [loading, normalizedSearch]);

  const navigateToSection = (sectionId) => {
    setActiveSection(sectionId);
    setMobileNavOpen(false);
    document.getElementById(`settings-${sectionId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const setField = (group, key, value) => {
    if (group === "portal" && key === "maintenanceMode" && value === true && !settings.portal.maintenanceMode) {
      setMaintenancePending(true);
      return;
    }
    updateField(group, key, value);
  };

  const handleSave = async () => {
    const result = await save(changeReason);
    setToast({ type: result.ok ? "success" : "error", text: result.message || (result.ok ? "Settings saved." : "Settings could not be saved.") });
    if (result.ok) setChangeReason("");
  };

  const handleReset = async () => {
    setResetError("");
    const result = await restoreDefaults(resetConfirmation, resetReason);
    if (!result.ok) {
      setResetError(result.message || "Unable to restore defaults.");
      return;
    }
    setResetOpen(false);
    setResetConfirmation("");
    setResetReason("");
    setToast({ type: "success", text: result.message });
  };

  const handleAssetUpload = async (assetType, file) => {
    const result = await uploadAsset(assetType, file);
    setToast({ type: result.ok ? "success" : "error", text: result.message });
    return result;
  };

  const renderField = (section, field) => {
    const group = section.id;
    const value = settings[group]?.[field.key];
    const fieldId = `${group}-${field.key}`;
    const fieldError = fieldErrors[`${group}.${field.key}`];
    if (field.showWhen && settings[group]?.[field.showWhen[0]] !== field.showWhen[1]) return null;

    if (field.type === "toggle") {
      return (
        <div className={field.full ? "settings-field-full" : ""} key={field.key}>
          <SettingToggle checked={Boolean(value)} disabled={readOnly} help={field.help} id={fieldId} label={field.label} onChange={(next) => setField(group, field.key, next)} />
          {fieldError ? <small className="settings-field-error">{fieldError}</small> : null}
        </div>
      );
    }
    if (field.type === "file") {
      return (
        <div className="settings-field-full" key={field.key}>
          <FileUploadPreview assetType={field.assetType} disabled={readOnly || dirty} label={field.label} maxKb={settings.organization.settingsUploadMaxKb} onUpload={handleAssetUpload} uploading={uploadingAsset === field.assetType} value={value} />
          {dirty ? <small className="settings-file-pending-note">Save or reset form changes before uploading branding files.</small> : null}
        </div>
      );
    }
    if (field.type === "multiselect") {
      return (
        <fieldset className={`settings-multiselect ${field.full ? "settings-field-full" : ""}`} key={field.key}>
          <legend>{field.label}</legend>
          <div>{field.options.map((item) => (
            <label key={item.value}>
              <input checked={(value || []).includes(item.value)} disabled={readOnly} onChange={(event) => {
                const next = event.target.checked ? [...(value || []), item.value] : (value || []).filter((candidate) => candidate !== item.value);
                setField(group, field.key, next);
              }} type="checkbox" />
              <span>{item.label}</span>
            </label>
          ))}</div>
          {fieldError ? <small className="settings-field-error">{fieldError}</small> : null}
        </fieldset>
      );
    }

    return (
      <label className={`settings-form-field ${field.full ? "settings-field-full" : ""}`} htmlFor={fieldId} key={field.key}>
        <span>{field.label}{field.required ? <b aria-hidden="true"> *</b> : null}</span>
        <div className={field.suffix ? "settings-input-with-suffix" : ""}>
          {field.type === "textarea" ? (
            <textarea disabled={readOnly} id={fieldId} onChange={(event) => setField(group, field.key, event.target.value)} rows={field.rows || 4} value={value ?? ""} />
          ) : field.type === "select" ? (
            <select disabled={readOnly} id={fieldId} onChange={(event) => setField(group, field.key, event.target.value)} value={value ?? ""}>
              {field.options.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          ) : (
            <input disabled={readOnly} id={fieldId} max={field.max} maxLength={field.maxLength} min={field.min} onChange={(event) => setField(group, field.key, field.type === "number" ? Number(event.target.value) : event.target.value)} required={field.required} type={field.type || "text"} value={value ?? ""} />
          )}
          {field.suffix ? <em>{field.suffix}</em> : null}
        </div>
        {field.help ? <small>{field.help}</small> : null}
        {fieldError ? <small className="settings-field-error">{fieldError}</small> : null}
      </label>
    );
  };

  if (loading) {
    return <div className="general-settings-loading" aria-label="Loading General Settings"><div className="settings-skeleton heading" /><div className="settings-skeleton-grid"><span /><span /><span /><span /></div></div>;
  }

  if (!settings) {
    return <div className="general-settings-load-error"><Icon name="alert" size={28} /><h1>General Settings could not be loaded</h1><p>{error}</p><button className="button button-primary" onClick={load} type="button"><Icon name="refresh" size={16} /> Try again</button></div>;
  }

  return (
    <div className="general-settings-page">
      {toast ? <div className={`settings-toast ${toast.type}`} role="status"><Icon name={toast.type === "success" ? "check" : "alert"} size={17} /><span>{toast.text}</span><button aria-label="Dismiss notification" onClick={() => setToast(null)} type="button"><Icon name="close" size={15} /></button></div> : null}

      <header className="general-settings-page-header">
        <div>
          <div className="settings-breadcrumb"><span>System Settings</span><Icon name="chevronRight" size={13} /><strong>General Settings</strong></div>
          <h1>General Settings</h1>
          <p>Manage organization identity, grievance workflows, security, reporting, and portal-wide defaults.</p>
          <div className="settings-updated-meta"><Icon name="clock" size={14} /> Last updated by <strong>{meta?.last_updated_by || "System"}</strong> on {formatUpdatedAt(meta?.last_updated_at)}</div>
        </div>
        <div className="general-settings-header-actions">
          {capabilities.can_view_history ? <button className="button button-secondary" onClick={() => setHistoryOpen(true)} type="button"><Icon name="audit" size={16} /> View Change History</button> : null}
          {capabilities.can_reset ? <button className="button button-secondary danger-outline" onClick={() => setResetOpen(true)} type="button"><Icon name="refresh" size={16} /> Restore Defaults</button> : null}
        </div>
      </header>

      {readOnly ? <div className="settings-readonly-banner"><Icon name="lock" size={18} /><div><strong>Read-only access</strong><span>You can review these settings, but only a Super Administrator can change them.</span></div></div> : null}
      {error ? <div className="settings-inline-error"><Icon name="alert" size={17} /> {error}</div> : null}

      <div className="general-settings-layout">
        <SettingsSidebar activeSection={activeSection} mobileOpen={mobileNavOpen} onNavigate={navigateToSection} onToggleMobile={() => setMobileNavOpen((current) => !current)} search={search} sections={visibleSections} setSearch={setSearch} />
        <main className="general-settings-content">
          {visibleSections.map((section) => (
            <SettingsSection description={section.description} icon={section.icon} id={section.id} key={section.id} title={section.title}>
              {section.preview === "ticket" ? <TicketPreview settings={settings.ticket} /> : null}
              {section.preview === "workflow" ? <div className="settings-workflow-preview" aria-label="Default grievance workflow">{["Submitted", "Under Review", "Assigned", "In Progress", "Resolved", "Closed"].map((status, index) => <span key={status}><b>{index + 1}</b>{status}{index < 5 ? <Icon name="chevronRight" size={14} /> : null}</span>)}</div> : null}
              <div className="general-settings-form-grid">{section.fields.map((field) => renderField(section, field))}</div>
              {section.preview === "dashboard" ? <DashboardPreview settings={settings.dashboard} /> : null}
            </SettingsSection>
          ))}
          {!visibleSections.length ? <div className="settings-empty-search"><Icon name="search" size={25} /><strong>No settings match “{search}”</strong><button onClick={() => setSearch("")} type="button">Clear search</button></div> : null}
        </main>
      </div>

      {!readOnly ? (
        <div className="settings-save-bar">
          <label><span>Change note <small>Optional · included in history</small></span><input maxLength={500} onChange={(event) => setChangeReason(event.target.value)} placeholder="Briefly explain this update" value={changeReason} /></label>
          <div><span className={dirty ? "settings-unsaved active" : "settings-unsaved"}>{dirty ? "Unsaved changes" : "All changes saved"}</span><button className="button button-secondary" disabled={!dirty || saving} onClick={discardChanges} type="button">Reset Changes</button><button className="button button-primary" disabled={!dirty || saving} onClick={handleSave} type="button"><Icon name="check" size={16} /> {saving ? "Saving..." : "Save Changes"}</button></div>
        </div>
      ) : null}

      <SettingsHistoryModal labels={settingLabels} onClose={() => setHistoryOpen(false)} open={historyOpen} />
      <UnsavedChangesModal onDiscard={() => { const destination = pendingHref; discardChanges(); setLeaveOpen(false); setPendingHref(""); navigate(destination); }} onKeepEditing={() => { setLeaveOpen(false); setPendingHref(""); }} open={leaveOpen} />

      {maintenancePending ? <div className="modal-backdrop settings-modal-backdrop"><section aria-labelledby="maintenance-title" aria-modal="true" className="settings-confirm-modal" role="dialog"><span className="settings-modal-icon warning"><Icon name="alert" size={23} /></span><h2 id="maintenance-title">Enable maintenance mode?</h2><p>Public users may be unable to submit or track grievances until maintenance mode is disabled.</p><div className="settings-modal-actions"><button className="button button-secondary" onClick={() => setMaintenancePending(false)} type="button">Cancel</button><button className="button button-primary" onClick={() => { updateField("portal", "maintenanceMode", true); setMaintenancePending(false); }} type="button">Enable maintenance</button></div></section></div> : null}

      {resetOpen ? <div className="modal-backdrop settings-modal-backdrop" onMouseDown={() => !saving && setResetOpen(false)}><section aria-labelledby="reset-title" aria-modal="true" className="settings-reset-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog"><header><div><p className="profile-eyebrow">Destructive action</p><h2 id="reset-title">Restore default settings</h2></div><button aria-label="Close reset dialog" className="settings-modal-close" disabled={saving} onClick={() => setResetOpen(false)} type="button"><Icon name="close" size={19} /></button></header><p>This replaces all General Settings with the system defaults and records each changed value in history.</p><label><span>Type <strong>RESET GENERAL SETTINGS</strong> to confirm</span><input autoComplete="off" onChange={(event) => setResetConfirmation(event.target.value)} value={resetConfirmation} /></label><label><span>Reason for resetting settings</span><textarea maxLength={500} onChange={(event) => setResetReason(event.target.value)} rows={3} value={resetReason} /></label>{resetError ? <div className="settings-inline-error">{resetError}</div> : null}<div className="settings-modal-actions"><button className="button button-secondary" disabled={saving} onClick={() => setResetOpen(false)} type="button">Cancel</button><button className="button button-danger" disabled={saving || resetConfirmation !== "RESET GENERAL SETTINGS" || resetReason.trim().length < 5} onClick={handleReset} type="button">{saving ? "Restoring..." : "Restore Default Settings"}</button></div></section></div> : null}
    </div>
  );
};

export default GeneralSettings;
