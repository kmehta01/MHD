import { useEffect, useMemo, useState } from "react";
import Icon from "../components/Icon";
import API from "../services/api";
import { downloadBlob } from "../utils/download";
import { hasPermission } from "../utils/permissions";

const actionOptions = [
  ["", "All actions"],
  ["login", "Login"],
  ["security", "Security"],
  ["create", "Create"],
  ["update", "Update"],
  ["delete", "Delete"],
  ["export", "Export"],
];

const formatBelizeDate = (value) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Belize",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const get = (type) => parts.find((part) => part.type === type)?.value || "";
  return `${get("day")}-${get("month")}-${get("year")} ${get("hour")}:${get("minute")}:${get("second")}`;
};

const AuditLogs = () => {
  const canExport = hasPermission("audit_logs.export");
  const [logs, setLogs] = useState([]);
  const [actors, setActors] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [userId, setUserId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    total_pages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  const filterParams = useMemo(
    () => ({
      ...(search ? { search } : {}),
      ...(action ? { action } : {}),
      ...(userId ? { user_id: userId } : {}),
      ...(dateFrom ? { date_from: dateFrom } : {}),
      ...(dateTo ? { date_to: dateTo } : {}),
    }),
    [action, dateFrom, dateTo, search, userId],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextSearch = searchInput.trim();
      if (nextSearch === search) return;
      setLoading(true);
      setError("");
      setPage(1);
      setSearch(nextSearch);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [search, searchInput]);

  useEffect(() => {
    let active = true;
    API.get("/audit-logs/actors")
      .then((response) => {
        if (active) setActors(response.data.data || []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    API.get("/audit-logs", {
      params: { ...filterParams, page, per_page: 25 },
    })
      .then((response) => {
        if (!active) return;
        setLogs(response.data.data || []);
        setPagination(
          response.data.pagination || { page: 1, total: 0, total_pages: 1 },
        );
      })
      .catch((requestError) => {
        if (!active) return;
        setLogs([]);
        setError(
          requestError.response?.data?.message || "Failed to load audit logs",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [filterParams, page]);

  const updateFilter = (setter) => (event) => {
    setLoading(true);
    setError("");
    setPage(1);
    setter(event.target.value);
  };

  const clearFilters = () => {
    if (search || action || userId || dateFrom || dateTo) {
      setLoading(true);
      setError("");
    }
    setSearchInput("");
    setSearch("");
    setAction("");
    setUserId("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const changePage = (nextPage) => {
    setLoading(true);
    setError("");
    setPage(nextPage);
  };

  const exportCsv = async () => {
    try {
      setExporting(true);
      setError("");
      const response = await API.get("/audit-logs/export", {
        params: filterParams,
        responseType: "blob",
      });
      const disposition = response.headers["content-disposition"] || "";
      const filename =
        disposition.match(/filename="?([^";]+)"?/i)?.[1] || "audit-logs.csv";
      downloadBlob(response.data, filename, "audit-logs.csv");
    } catch {
      setError("Failed to export audit logs");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="audit-page">
      <div className="module-page-header audit-header">
        <div>
          <span className="eyebrow">Security oversight</span>
          <h1>Audit Logs</h1>
          <p>
            Review administrator activity and authentication events. Times are
            shown in Belize time.
          </p>
        </div>
        {canExport ? (
          <button
            className="button button-primary"
            disabled={exporting}
            onClick={exportCsv}
            type="button"
          >
            <Icon name="download" size={17} />{" "}
            {exporting ? "Exporting..." : "Export CSV"}
          </button>
        ) : null}
      </div>

      <section className="panel audit-panel">
        <div className="audit-filters">
          <label className="audit-search">
            <span className="sr-only">Search audit logs</span>
            <Icon name="search" size={18} />
            <input
              maxLength="100"
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search message, user ID, IP, or record ID"
              type="search"
              value={searchInput}
            />
          </label>

          <label>
            <span>Action</span>
            <select onChange={updateFilter(setAction)} value={action}>
              {actionOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>User</span>
            <select onChange={updateFilter(setUserId)} value={userId}>
              <option value="">All users</option>
              {actors.map((actor) => (
                <option key={actor.id} value={actor.id}>
                  {actor.name} (#{actor.id})
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>From</span>
            <input
              onChange={updateFilter(setDateFrom)}
              type="date"
              value={dateFrom}
            />
          </label>

          <label>
            <span>To</span>
            <input
              onChange={updateFilter(setDateTo)}
              type="date"
              value={dateTo}
            />
          </label>

          <button className="audit-clear" onClick={clearFilters} type="button">
            Clear
          </button>
        </div>

        {error ? (
          <div className="audit-error" role="alert">
            {error}
          </div>
        ) : null}

        <div className="audit-table-wrap">
          <table className="audit-table">
            <thead>
              <tr>
                <th>Message</th>
                <th>User</th>
                <th>IP Address</th>
                <th>Action</th>
                <th>Platform</th>
                <th>Agent</th>
                <th>Date Time</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="audit-status" colSpan="7">
                    Loading audit logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td className="audit-status" colSpan="7">
                    No audit events match these filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td className="audit-message">{log.message}</td>
                    <td>
                      {log.actor
                        ? `${log.actor.name || "Unknown"}${log.actor.id ? ` (#${log.actor.id})` : ""}`
                        : "Unknown"}
                    </td>
                    <td className="audit-nowrap">
                      {log.ip_address || "Unknown"}
                    </td>
                    <td>
                      <span
                        className={`audit-action audit-action-${log.action}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td>{log.platform}</td>
                    <td>{log.agent}</td>
                    <td className="audit-nowrap">
                      {formatBelizeDate(log.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="audit-pagination">
          <span>
            {pagination.total} event{pagination.total === 1 ? "" : "s"}
          </span>
          <div>
            <button
              disabled={loading || page <= 1}
              onClick={() => changePage(page - 1)}
              type="button"
            >
              Previous
            </button>
            <span>
              Page {pagination.page} of {pagination.total_pages}
            </span>
            <button
              disabled={loading || page >= pagination.total_pages}
              onClick={() => changePage(page + 1)}
              type="button"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AuditLogs;
