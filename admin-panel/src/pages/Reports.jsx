import { useCallback, useEffect, useState } from "react";
import Icon from "../components/Icon";
import API from "../services/api";
import { downloadBlob } from "../utils/download";

const formatDate = (value) => value
  ? new Intl.DateTimeFormat("en-BZ", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
  : "Not available";

const Reports = () => {
  const [options, setOptions] = useState(null);
  const [reports, setReports] = useState([]);
  const [form, setForm] = useState({ format: "", status: "", priority: "", departmentId: "", dateFrom: "", dateTo: "" });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadReports = useCallback(async () => {
    const response = await API.get("/reports");
    setReports(response.data.data || []);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([API.get("/reports/options"), API.get("/reports")])
      .then(([optionsResponse, reportsResponse]) => {
        if (!active) return;
        const nextOptions = optionsResponse.data.data;
        setOptions(nextOptions);
        setForm((current) => ({ ...current, format: nextOptions.defaultFormat }));
        setReports(reportsResponse.data.data || []);
      })
      .catch((requestError) => { if (active) setError(requestError.response?.data?.message || "Failed to load reports"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!reports.some((report) => ["pending", "processing"].includes(report.status))) return undefined;
    const timer = window.setInterval(() => loadReports().catch(() => {}), 4000);
    return () => window.clearInterval(timer);
  }, [loadReports, reports]);

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const create = async (event) => {
    event.preventDefault();
    try {
      setBusy(true); setError("");
      await API.post("/reports", form);
      await loadReports();
    } catch (requestError) { setError(requestError.response?.data?.message || "Failed to create report"); }
    finally { setBusy(false); }
  };

  const download = async (report) => {
    try {
      setBusy(true); setError("");
      const response = await API.get(`/reports/${report.id}/download`, { responseType: "blob" });
      downloadBlob(response.data, report.output_name, "grievance-report");
    } catch (requestError) { setError(requestError.response?.data?.message || "Failed to download report"); }
    finally { setBusy(false); }
  };

  if (loading) return <div className="panel module-loading">Loading report policy…</div>;

  return (
    <div className="reports-page">
      <div className="module-page-header">
        <div><p className="profile-eyebrow">Reporting</p><h1>Grievance Reports</h1><p>Create policy-controlled, audited PDF, Excel, or CSV exports.</p></div>
      </div>
      {error ? <div className="grievance-error" role="alert">{error}</div> : null}
      {!options?.enabled ? <div className="panel grievance-error">Exports are disabled for your role or by General Settings.</div> : (
        <form className="panel report-builder" onSubmit={create}>
          <div className="panel-header compact"><div><h2>Create report</h2><p>Exports are limited to {options.maximumRecords.toLocaleString()} records.</p></div></div>
          <div className="report-filter-grid">
            <label><span>Format</span><select name="format" onChange={update} required value={form.format}>{options.formats.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label><span>Status</span><select name="status" onChange={update} value={form.status}><option value="">All statuses</option>{options.statuses.map((item) => <option key={item.id} value={item.status_key}>{item.name}</option>)}</select></label>
            <label><span>Priority</span><select name="priority" onChange={update} value={form.priority}><option value="">All priorities</option>{options.priorities.map((item) => <option key={item.id} value={item.priority_key}>{item.name}</option>)}</select></label>
            <label><span>Department</span><select name="departmentId" onChange={update} value={form.departmentId}><option value="">All permitted departments</option>{options.departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label><span>From date</span><input name="dateFrom" onChange={update} type="date" value={form.dateFrom} /></label>
            <label><span>To date</span><input min={form.dateFrom || undefined} name="dateTo" onChange={update} type="date" value={form.dateTo} /></label>
          </div>
          <button className="button button-primary" disabled={busy} type="submit"><Icon name="download" size={16} /> {busy ? "Queuing…" : "Create report"}</button>
        </form>
      )}

      <section className="panel report-jobs">
        <div className="panel-header compact"><div><h2>Report jobs</h2><p>Pending reports refresh automatically.</p></div><button className="button button-secondary" onClick={() => loadReports().catch(() => {})} type="button"><Icon name="refresh" size={16} /> Refresh</button></div>
        {reports.length ? <div className="module-table-wrap"><table className="module-table"><thead><tr><th>Created</th><th>Format</th><th>Status</th><th>Records</th><th>Action</th></tr></thead><tbody>{reports.map((report) => <tr key={report.id}><td>{formatDate(report.created_at)}</td><td>{report.output_format}</td><td><span className={`status-badge ${report.status}`}>{report.status}</span>{report.error_message ? <small>{report.error_message}</small> : null}</td><td>{report.total_records}</td><td>{report.status === "completed" ? <button className="button button-secondary" disabled={busy} onClick={() => download(report)} type="button">Download</button> : "—"}</td></tr>)}</tbody></table></div> : <div className="module-empty">No report jobs have been created.</div>}
      </section>
    </div>
  );
};

export default Reports;
