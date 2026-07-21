import { useCallback, useEffect, useState } from "react";
import Icon from "../Icon";
import { getTicketNumberHistory } from "../../services/ticketSettingsApi";

const TicketSettingsHistoryModal = ({ onClose, open }) => {
  const [filters, setFilters] = useState({ dateFrom: "", dateTo: "", changedBy: "", changeType: "", settingKey: "" });
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async (page = 1) => {
    try {
      setLoading(true); setError("");
      const response = await getTicketNumberHistory({ ...filters, page, perPage: 15 });
      setRows(response.data.data); setMeta(response.data.meta);
    } catch (requestError) { setError(requestError.response?.data?.message || "Unable to load change history."); }
    finally { setLoading(false); }
  }, [filters]);
  useEffect(() => { if (!open) return undefined; const timer = window.setTimeout(() => load(1), 0); return () => window.clearTimeout(timer); }, [load, open]);
  if (!open) return null;
  return <div className="modal-backdrop settings-modal-backdrop" onMouseDown={onClose}><section aria-labelledby="ticket-history-title" aria-modal="true" className="ticket-history-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog"><header><div><p className="profile-eyebrow">Audit trail</p><h2 id="ticket-history-title">Ticket Number Format history</h2></div><button aria-label="Close history" className="settings-modal-close" onClick={onClose} type="button"><Icon name="close" size={19} /></button></header><div className="ticket-history-filters"><label>From<input onChange={(event) => setFilters((value) => ({ ...value, dateFrom: event.target.value }))} type="date" value={filters.dateFrom} /></label><label>To<input onChange={(event) => setFilters((value) => ({ ...value, dateTo: event.target.value }))} type="date" value={filters.dateTo} /></label><label>Change type<select onChange={(event) => setFilters((value) => ({ ...value, changeType: event.target.value }))} value={filters.changeType}><option value="">All</option><option value="settings_update">Settings update</option><option value="format_change">Format change</option><option value="sequence_reset">Sequence reset</option></select></label><label>Setting key<input onChange={(event) => setFilters((value) => ({ ...value, settingKey: event.target.value }))} placeholder="e.g. ticketFormat" value={filters.settingKey} /></label><label>Changed-by ID<input min="1" onChange={(event) => setFilters((value) => ({ ...value, changedBy: event.target.value }))} type="number" value={filters.changedBy} /></label><button className="button button-secondary" onClick={() => load(1)} type="button">Apply filters</button></div>{error ? <div className="settings-inline-error">{error}</div> : null}<div className="ticket-history-table-wrap"><table><thead><tr><th>Date & time</th><th>Setting</th><th>Previous</th><th>New</th><th>Changed by</th><th>Type</th><th>Reason / IP</th></tr></thead><tbody>{loading ? <tr><td colSpan="7">Loading history…</td></tr> : rows.length ? rows.map((row) => <tr key={row.id}><td>{new Date(row.created_at).toLocaleString("en-BZ")}</td><td>{row.setting_key}</td><td><code>{row.old_value ?? "—"}</code></td><td><code>{row.new_value ?? "—"}</code></td><td>{row.changed_by_name || `User #${row.changed_by}`}</td><td>{row.change_type.replaceAll("_", " ")}</td><td>{row.reason || "—"}<small>{row.ip_address || ""}</small></td></tr>) : <tr><td colSpan="7">No changes match these filters.</td></tr>}</tbody></table></div><footer><span>{meta.total || 0} changes</span><div><button disabled={meta.page <= 1} onClick={() => load(meta.page - 1)} type="button">Previous</button><span>Page {meta.page || 1} of {meta.totalPages || 1}</span><button disabled={meta.page >= meta.totalPages} onClick={() => load(meta.page + 1)} type="button">Next</button></div></footer></section></div>;
};

export default TicketSettingsHistoryModal;
