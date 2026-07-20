import { useEffect, useState } from "react";
import Icon from "../Icon";
import { getGeneralSettingsHistory } from "../../services/settingsApi";

const formatValue = (value) => {
  if (value === null || value === undefined || value === "") return "Not set";
  if (value === "1") return "Enabled";
  if (value === "0") return "Disabled";
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.join(", ");
  } catch {
    // Plain settings values do not need JSON formatting.
  }
  return value;
};

const SettingsHistoryModal = ({ labels, onClose, open }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      getGeneralSettingsHistory()
        .then((response) => { if (active) setHistory(response.data.data || []); })
        .catch((requestError) => { if (active) setError(requestError.response?.data?.message || "Unable to load change history."); })
        .finally(() => { if (active) setLoading(false); });
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [open]);

  if (!open) return null;
  return (
    <div className="modal-backdrop settings-modal-backdrop" onMouseDown={onClose}>
      <section aria-labelledby="history-title" aria-modal="true" className="settings-history-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog">
        <header>
          <div><p className="profile-eyebrow">Audit trail</p><h2 id="history-title">General Settings change history</h2></div>
          <button aria-label="Close history" className="settings-modal-close" onClick={onClose} type="button"><Icon name="close" size={19} /></button>
        </header>
        <div className="settings-history-content">
          {loading ? <div className="settings-history-loading"><span className="settings-spinner" /> Loading history...</div> : null}
          {error ? <div className="settings-inline-error">{error}</div> : null}
          {!loading && !error && !history.length ? <div className="settings-empty-state"><Icon name="audit" size={27} /><strong>No changes recorded</strong><span>Setting changes will appear here.</span></div> : null}
          {!loading && history.length ? (
            <div className="settings-history-table-wrap">
              <table className="settings-history-table">
                <thead><tr><th>Date and time</th><th>Setting</th><th>Previous value</th><th>New value</th><th>Changed by</th><th>IP address</th><th>Reason</th></tr></thead>
                <tbody>{history.map((item) => (
                  <tr key={item.id}>
                    <td>{new Intl.DateTimeFormat("en-BZ", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.created_at))}</td>
                    <td><strong>{labels.get(item.setting_key) || item.setting_key}</strong><small>{item.setting_key}</small></td>
                    <td>{formatValue(item.old_value)}</td><td>{formatValue(item.new_value)}</td>
                    <td>{item.changed_by_name || `User #${item.changed_by}`}</td><td>{item.ip_address || "—"}</td><td>{item.change_reason || "—"}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
};

export default SettingsHistoryModal;
