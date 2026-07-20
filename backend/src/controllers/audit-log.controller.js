const { UAParser } = require("ua-parser-js");
const AuditLogModel = require("../models/audit-log.model");
const { recordAuditEvent } = require("../services/audit-log.service");
const { getAuditScope } = require("../utils/access-scope");

const ACTIONS = new Set(["login", "security", "create", "update", "delete", "export"]);
const BELIZE_OFFSET_HOURS = 6;

const parseDate = (value, exclusiveEnd = false) => {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const validation = new Date(Date.UTC(year, month - 1, day));
  if (
    validation.getUTCFullYear() !== year ||
    validation.getUTCMonth() !== month - 1 ||
    validation.getUTCDate() !== day
  ) return undefined;

  return new Date(Date.UTC(
    year,
    month - 1,
    day + (exclusiveEnd ? 1 : 0),
    BELIZE_OFFSET_HOURS,
  ));
};

const getFilters = (query) => {
  const search = String(query.search || "").trim().slice(0, 100);
  const action = String(query.action || "").trim().toLowerCase();
  const userId = query.user_id ? Number(query.user_id) : null;
  const dateFrom = parseDate(query.date_from);
  const dateTo = parseDate(query.date_to, true);

  if (action && !ACTIONS.has(action)) throw new Error("Invalid action filter");
  if (query.user_id && (!Number.isInteger(userId) || userId <= 0)) {
    throw new Error("Invalid user filter");
  }
  if (dateFrom === undefined || dateTo === undefined) {
    throw new Error("Dates must use YYYY-MM-DD format");
  }
  if (dateFrom && dateTo && dateFrom >= dateTo) {
    throw new Error("The start date must be before or equal to the end date");
  }

  return { search, action: action || null, userId, dateFrom, dateTo };
};

const parseUserAgent = (rawUserAgent) => {
  if (!rawUserAgent) return { platform: "Unknown", agent: "Unknown" };
  const parsed = UAParser(rawUserAgent);
  const platform = [parsed.os.name, parsed.os.version].filter(Boolean).join(" ") || "Unknown";
  const agent = [parsed.browser.name, parsed.browser.version].filter(Boolean).join(" ") || "Unknown";
  return { platform, agent };
};

const normalizeRow = (row) => ({
  id: row.id,
  message: row.message,
  actor: row.actor_user_id || row.actor_name
    ? { id: row.actor_user_id, name: row.actor_name, role: row.actor_role_slug }
    : null,
  ip_address: row.ip_address,
  action: row.action,
  success: Boolean(row.success),
  created_at: new Date(row.created_at).toISOString(),
  ...parseUserAgent(row.user_agent),
});

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

const csvCell = (value) => {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

const getAuditLogs = async (req, res) => {
  try {
    const filters = {
      ...getFilters(req.query),
      scope: getAuditScope(req.user),
    };
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const perPage = Math.min(100, Math.max(1, Number.parseInt(req.query.per_page, 10) || 25));
    const { rows, total } = await AuditLogModel.findAll(filters, {
      limit: perPage,
      offset: (page - 1) * perPage,
    });

    return res.json({
      status: true,
      data: rows.map(normalizeRow),
      pagination: {
        page,
        per_page: perPage,
        total,
        total_pages: Math.max(1, Math.ceil(total / perPage)),
      },
    });
  } catch (error) {
    const clientError = error.message.startsWith("Invalid") || error.message.startsWith("Dates") || error.message.startsWith("The start");
    return res.status(clientError ? 400 : 500).json({
      status: false,
      message: clientError ? error.message : "Failed to fetch audit logs",
      error: process.env.NODE_ENV === "development" && !clientError ? error.message : undefined,
    });
  }
};

const getAuditActors = async (req, res) => {
  try {
    const actors = await AuditLogModel.findActors(getAuditScope(req.user));
    return res.json({ status: true, data: actors });
  } catch (error) {
    return res.status(500).json({ status: false, message: "Failed to fetch audit users" });
  }
};

const exportAuditLogs = async (req, res) => {
  try {
    const filters = {
      ...getFilters(req.query),
      scope: getAuditScope(req.user),
    };
    const rows = await AuditLogModel.findForExport(filters);

    await recordAuditEvent(req, {
      eventType: "AUDIT_LOG_EXPORTED",
      resourceType: "audit_log",
    });

    const header = ["Message", "User", "IP Address", "Action", "Platform", "Agent", "Date Time"];
    const lines = [header.map(csvCell).join(",")];
    rows.forEach((row) => {
      const normalized = normalizeRow(row);
      const user = normalized.actor
        ? `${normalized.actor.name || "Unknown"} (#${normalized.actor.id})`
        : "Unknown";
      lines.push([
        normalized.message,
        user,
        normalized.ip_address,
        normalized.action,
        normalized.platform,
        normalized.agent,
        formatBelizeDate(normalized.created_at),
      ].map(csvCell).join(","));
    });

    const filename = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(`\uFEFF${lines.join("\r\n")}`);
  } catch (error) {
    const clientError = error.message.startsWith("Invalid") || error.message.startsWith("Dates") || error.message.startsWith("The start");
    return res.status(clientError ? 400 : 500).json({
      status: false,
      message: clientError ? error.message : "Failed to export audit logs",
    });
  }
};

module.exports = { exportAuditLogs, getAuditActors, getAuditLogs };
