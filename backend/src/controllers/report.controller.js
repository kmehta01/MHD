const crypto = require("crypto");
const path = require("path");
const ReportModel = require("../models/report.model");
const SettingsPolicy = require("../services/settings-policy.service");
const ConfigurationModel = require("../models/configuration.model");
const { getGrievanceScope, hasPermission } = require("../utils/access-scope");
const { recordAuditEvent } = require("../services/audit-log.service");

const backendRoot = path.resolve(__dirname, "../..");
const canExport = (user, settings) => user.role_slug === "super-admin" ||
  (user.role_slug === "admin" && settings.reports.allowAdminExport) ||
  (user.role_slug === "ministry-user" && settings.reports.allowMinistryExport);

const createReport = async (req, res) => {
  try {
    const settings = await SettingsPolicy.getPolicy();
    if (!settings.privacy.allowGrievanceExport) return res.status(403).json({ status: false, message: "Grievance exports are disabled by privacy policy" });
    if (!canExport(req.user, settings)) return res.status(403).json({ status: false, message: "Your role is not allowed to export reports" });
    const outputFormat = String(req.body.format || settings.reports.defaultReportFormat);
    if (!new Set(["PDF", "Excel", "CSV"]).has(outputFormat)) return res.status(400).json({ status: false, message: "Report format must be PDF, Excel, or CSV" });
    const scope = getGrievanceScope(req.user);
    if (scope.type === "none") return res.status(403).json({ status: false, message: "A department assignment is required" });
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    const workflow = await ConfigurationModel.listWorkflow();
    const statusRef = String(req.body.status || "").trim();
    const priorityRef = String(req.body.priority || "").trim();
    const status = statusRef ? workflow.statuses.find((item) => item.is_active && (item.status_key === statusRef || item.name === statusRef)) : null;
    const priority = priorityRef ? workflow.priorities.find((item) => item.is_active && (item.priority_key === priorityRef || item.name === priorityRef)) : null;
    if (statusRef && !status) return res.status(400).json({ status: false, message: "Invalid status filter" });
    if (priorityRef && !priority) return res.status(400).json({ status: false, message: "Invalid priority filter" });
    const filters = {
      statusId: status?.id || null,
      priorityId: priority?.id || null,
      dateFrom: datePattern.test(req.body.dateFrom) ? req.body.dateFrom : null,
      dateTo: datePattern.test(req.body.dateTo) ? req.body.dateTo : null,
      departmentId: scope.type === "department" ? scope.departmentId : (Number(req.body.departmentId) || null),
    };
    const reportId = crypto.randomUUID();
    const settingsSnapshot = JSON.parse(JSON.stringify(settings));
    if (!hasPermission(req.user, "grievances.view_pii")) settingsSnapshot.reports.maskSensitiveDataInReports = true;
    await ReportModel.create({ id: reportId, requestedBy: req.user.id, reportType: "grievances", outputFormat, filters, settingsSnapshot });
    try { await recordAuditEvent(req, { eventType: "GRIEVANCE_EXPORTED", resourceType: "report_job", resourceId: reportId }); } catch {}
    return res.status(202).json({ status: true, message: "Report generation queued", data: { id: reportId, status: "pending" } });
  } catch (error) { return res.status(500).json({ status: false, message: "Failed to create report", error: process.env.NODE_ENV === "development" ? error.message : undefined }); }
};

const listReports = async (req, res) => {
  try { return res.json({ status: true, data: await ReportModel.listForUser({ userId: req.user.id, all: req.user.role_slug === "super-admin" }) }); }
  catch (error) { return res.status(500).json({ status: false, message: "Failed to load reports" }); }
};

const getReportOptions = async (req, res) => {
  try {
    const [settings, workflow, catalog] = await Promise.all([
      SettingsPolicy.getPolicy(), ConfigurationModel.listWorkflow(), ConfigurationModel.listPublicCatalog(),
    ]);
    return res.json({
      status: true,
      data: {
        formats: ["PDF", "Excel", "CSV"],
        defaultFormat: settings.reports.defaultReportFormat,
        maximumRecords: settings.reports.maximumExportRecords,
        enabled: settings.privacy.allowGrievanceExport && canExport(req.user, settings),
        statuses: workflow.statuses.filter((item) => item.is_active),
        priorities: workflow.priorities.filter((item) => item.is_active),
        departments: catalog.departments,
      },
    });
  } catch (error) { return res.status(500).json({ status: false, message: "Failed to load report options" }); }
};

const getReport = async (req, res) => {
  try {
    const report = await ReportModel.findById(req.params.id);
    if (!report || (req.user.role_slug !== "super-admin" && report.requested_by !== req.user.id)) return res.status(404).json({ status: false, message: "Report not found" });
    const { output_path: _path, settings_snapshot: _settings, ...data } = report;
    return res.json({ status: true, data });
  } catch (error) { return res.status(500).json({ status: false, message: "Failed to load report" }); }
};

const downloadReport = async (req, res) => {
  try {
    const [settings, report] = await Promise.all([SettingsPolicy.getPolicy(), ReportModel.findById(req.params.id)]);
    if (!settings.privacy.allowGrievanceExport || !canExport(req.user, settings)) return res.status(403).json({ status: false, message: "Report downloads are disabled" });
    if (!report || report.status !== "completed" || (req.user.role_slug !== "super-admin" && report.requested_by !== req.user.id)) return res.status(404).json({ status: false, message: "Completed report not found" });
    const absolute = path.resolve(backendRoot, report.output_path);
    const root = path.resolve(backendRoot, "generated", "reports");
    const relative = path.relative(root, absolute);
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) return res.status(404).json({ status: false, message: "Report file is unavailable" });
    try { await recordAuditEvent(req, { eventType: "GRIEVANCE_EXPORTED", resourceType: "report_job", resourceId: report.id }); } catch {}
    return res.download(absolute, report.output_name);
  } catch (error) { return res.status(500).json({ status: false, message: "Failed to download report" }); }
};

module.exports = { createReport, downloadReport, getReport, getReportOptions, listReports };
