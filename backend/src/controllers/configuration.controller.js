const ConfigurationModel = require("../models/configuration.model");
const { recordAuditEvent } = require("../services/audit-log.service");

const positiveId = (value, label = "ID") => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw Object.assign(new Error(`A valid ${label} is required`), { statusCode: 400 });
  return id;
};

const requiredText = (value, label, maxLength = 160) => {
  const text = String(value || "").trim();
  if (!text) throw Object.assign(new Error(`${label} is required`), { statusCode: 400 });
  if (text.length > maxLength) throw Object.assign(new Error(`${label} must not exceed ${maxLength} characters`), { statusCode: 400 });
  return text;
};

const sendError = (res, error, fallback) => {
  const statusCode = error.statusCode || (error.code === "ER_DUP_ENTRY" ? 409 : 500);
  return res.status(statusCode).json({
  status: false,
  message: error.statusCode ? error.message : error.code === "ER_DUP_ENTRY" ? "A record with this stable key, code, or name already exists" : fallback,
  error: process.env.NODE_ENV === "development" && !error.statusCode ? error.message : undefined,
  });
};

const audit = async (req, eventType, resourceType, resourceId) => {
  try { await recordAuditEvent(req, { eventType, resourceType, resourceId }); }
  catch (error) { console.error(`Failed to audit ${eventType}:`, error.message); }
};

const getPublicCatalog = async (_req, res) => {
  try { return res.json({ status: true, data: await ConfigurationModel.listPublicCatalog() }); }
  catch (error) { return sendError(res, error, "Failed to load grievance options"); }
};

const getConfiguration = async (_req, res) => {
  try {
    const [categories, locations, departments, holidays, routingRules, workflow, officers, publicCatalog] = await Promise.all([
      ConfigurationModel.listCatalog("categories"), ConfigurationModel.listCatalog("locations"),
      ConfigurationModel.listCatalog("departments"),
      ConfigurationModel.listHolidays(), ConfigurationModel.listRoutingRules(),
      ConfigurationModel.listWorkflow(), ConfigurationModel.listAssignableOfficers(),
      ConfigurationModel.listPublicCatalog(),
    ]);
    return res.json({ status: true, data: { categories, locations, departments, categoryMappings: publicCatalog.categories.map(({ id, departmentIds }) => ({ categoryId: id, departmentIds })), holidays, routingRules, workflow, officers } });
  } catch (error) { return sendError(res, error, "Failed to load configuration"); }
};

const saveCatalogItem = async (req, res) => {
  try {
    const catalog = String(req.params.catalog || "");
    const id = req.params.id ? positiveId(req.params.id) : null;
    if (id && req.body.isActive === false) {
      const dependencies = await ConfigurationModel.getDeactivationDependencies(catalog, id);
      if (Object.values(dependencies).some(Boolean)) return res.status(409).json({ status: false, message: "This record is still used by active data", dependencies });
    }
    const itemId = await ConfigurationModel.saveCatalogItem(catalog, {
      id,
      code: requiredText(req.body.code, "Code", catalog === "departments" ? 20 : 40).toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, ""),
      name: requiredText(req.body.name, "Name"),
      isActive: req.body.isActive !== false,
    });
    if (!itemId) return res.status(404).json({ status: false, message: "Catalog item not found" });
    await audit(req, "CONFIGURATION_UPDATED", catalog, itemId);
    return res.status(id ? 200 : 201).json({ status: true, data: { id: itemId } });
  } catch (error) { return sendError(res, error, "Failed to save catalog item"); }
};

const deactivateCatalogItem = async (req, res) => {
  try {
    const id = positiveId(req.params.id);
    const dependencies = await ConfigurationModel.getDeactivationDependencies(req.params.catalog, id);
    if (Object.values(dependencies).some(Boolean)) return res.status(409).json({ status: false, message: "This record is still used by active data", dependencies });
    if (!await ConfigurationModel.deactivateCatalogItem(req.params.catalog, id)) return res.status(404).json({ status: false, message: "Catalog item not found" });
    await audit(req, "CONFIGURATION_UPDATED", req.params.catalog, id);
    return res.json({ status: true, message: "Catalog item deactivated" });
  } catch (error) { return sendError(res, error, "Failed to deactivate catalog item"); }
};

const normalizedKey = (value, label) => requiredText(value, label, 50).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
const flag = (value, defaultValue = false) => value === undefined ? defaultValue : Boolean(value);

const saveStatus = async (req, res) => {
  try {
    const id = req.params.id ? positiveId(req.params.id) : null;
    const reportingGroup = requiredText(req.body.reportingGroup, "Reporting group", 20);
    const notificationEvent = requiredText(req.body.notificationEvent || "status_change", "Notification event", 20);
    if (!new Set(["open", "resolved", "closed", "rejected", "duplicate", "other"]).has(reportingGroup)) throw Object.assign(new Error("Invalid reporting group"), { statusCode: 400 });
    if (!new Set(["status_change", "resolution", "closure", "returned"]).has(notificationEvent)) throw Object.assign(new Error("Invalid notification event"), { statusCode: 400 });
    const isFinal = flag(req.body.isFinal);
    if ((reportingGroup === "open" && isFinal) || (["closed", "rejected", "duplicate"].includes(reportingGroup) && !isFinal)) {
      throw Object.assign(new Error("Final-state behavior does not match the reporting group"), { statusCode: 400 });
    }
    const eventGroups = { resolution: "resolved", closure: "closed", returned: "open" };
    if (eventGroups[notificationEvent] && eventGroups[notificationEvent] !== reportingGroup) {
      throw Object.assign(new Error("Notification behavior does not match the reporting group"), { statusCode: 400 });
    }
    if (id && req.body.isActive === false) {
      const workflow = await ConfigurationModel.listWorkflow();
      if (workflow.statuses.find((item) => item.id === id)?.is_system) {
        return res.status(409).json({ status: false, message: "Required system statuses cannot be deactivated", dependencies: { systemStatus: 1 } });
      }
      const dependencies = await ConfigurationModel.getDeactivationDependencies("statuses", id);
      if (Object.values(dependencies).some(Boolean)) return res.status(409).json({ status: false, message: "This status is still used by active workflow data", dependencies });
    }
    const itemId = await ConfigurationModel.saveStatus({
      id, key: id ? undefined : normalizedKey(req.body.key, "Status key"), name: requiredText(req.body.name, "Name", 80),
      reportingGroup, notificationEvent, isFinal: isFinal ? 1 : 0,
      isActive: flag(req.body.isActive, true) ? 1 : 0, sortOrder: Math.max(0, Number.parseInt(req.body.sortOrder, 10) || 0),
    });
    if (!itemId) return res.status(404).json({ status: false, message: "Status not found" });
    await audit(req, "CONFIGURATION_UPDATED", "complaint_status", itemId);
    return res.status(id ? 200 : 201).json({ status: true, data: { id: itemId } });
  } catch (error) { return sendError(res, error, "Failed to save status"); }
};

const savePriority = async (req, res) => {
  try {
    const id = req.params.id ? positiveId(req.params.id) : null;
    if (id && req.body.isActive === false) {
      const dependencies = await ConfigurationModel.getDeactivationDependencies("priorities", id);
      if (Object.values(dependencies).some(Boolean)) return res.status(409).json({ status: false, message: "This priority is still used by active data", dependencies });
    }
    const itemId = await ConfigurationModel.savePriority({
      id, key: id ? undefined : normalizedKey(req.body.key, "Priority key"), name: requiredText(req.body.name, "Name", 80),
      isHighPriority: flag(req.body.isHighPriority) ? 1 : 0, isActive: flag(req.body.isActive, true) ? 1 : 0,
      sortOrder: Math.max(0, Number.parseInt(req.body.sortOrder, 10) || 0),
    });
    if (!itemId) return res.status(404).json({ status: false, message: "Priority not found" });
    await audit(req, "CONFIGURATION_UPDATED", "complaint_priority", itemId);
    return res.status(id ? 200 : 201).json({ status: true, data: { id: itemId } });
  } catch (error) { return sendError(res, error, "Failed to save priority"); }
};

const deactivateWorkflowItem = async (req, res) => {
  try {
    const type = req.params.type;
    if (!new Set(["statuses", "priorities"]).has(type)) throw Object.assign(new Error("Unsupported workflow type"), { statusCode: 400 });
    const id = positiveId(req.params.id);
    const dependencies = await ConfigurationModel.getDeactivationDependencies(type, id);
    if (Object.values(dependencies).some(Boolean)) return res.status(409).json({ status: false, message: "This record is still used by active workflow data", dependencies });
    const method = type === "statuses" ? ConfigurationModel.saveStatus : ConfigurationModel.savePriority;
    const workflow = await ConfigurationModel.listWorkflow();
    const item = workflow[type].find((candidate) => Number(candidate.id) === id);
    if (!item) return res.status(404).json({ status: false, message: "Workflow item not found" });
    if (type === "statuses" && item.is_system) return res.status(409).json({ status: false, message: "Required system statuses cannot be deactivated", dependencies: { systemStatus: 1 } });
    await method(type === "statuses" ? {
      id, name: item.name, reportingGroup: item.reporting_group, notificationEvent: item.notification_event,
      isFinal: item.is_final, isActive: 0, sortOrder: item.sort_order,
    } : { id, name: item.name, isHighPriority: item.is_high_priority, isActive: 0, sortOrder: item.sort_order });
    await audit(req, "CONFIGURATION_UPDATED", type, id);
    return res.json({ status: true, message: "Workflow item deactivated" });
  } catch (error) { return sendError(res, error, "Failed to deactivate workflow item"); }
};

const saveCategoryMappings = async (req, res) => {
  try {
    const categoryId = positiveId(req.params.id, "category ID");
    if (!Array.isArray(req.body.departmentIds)) throw Object.assign(new Error("departmentIds must be an array"), { statusCode: 400 });
    const departmentIds = [...new Set(req.body.departmentIds.map((id) => positiveId(id, "department ID")))];
    const [category, ...departments] = await Promise.all([
      ConfigurationModel.findActiveCatalogItem("complaint_categories", categoryId),
      ...departmentIds.map((departmentId) => ConfigurationModel.findActiveCatalogItem("departments", departmentId)),
    ]);
    if (!category || departments.some((department) => !department)) throw Object.assign(new Error("Mappings require active categories and departments"), { statusCode: 400 });
    await ConfigurationModel.saveCategoryMappings(categoryId, departmentIds);
    await audit(req, "CONFIGURATION_UPDATED", "category_mapping", categoryId);
    return res.json({ status: true, data: { categoryId, departmentIds } });
  } catch (error) { return sendError(res, error, "Failed to save category mappings"); }
};

const saveTransition = async (req, res) => {
  try {
    const fromStatusId = positiveId(req.body.fromStatusId, "from status ID");
    const toStatusId = positiveId(req.body.toStatusId, "to status ID");
    if (fromStatusId === toStatusId) throw Object.assign(new Error("A status cannot transition to itself"), { statusCode: 400 });
    const workflow = await ConfigurationModel.listWorkflow();
    const requestedActive = flag(req.body.isActive, true);
    if (![fromStatusId, toStatusId].every((statusId) => workflow.statuses.some((item) => item.id === statusId && (!requestedActive || item.is_active)))) {
      throw Object.assign(new Error("Transitions require active statuses"), { statusCode: 400 });
    }
    const id = await ConfigurationModel.saveTransition({ fromStatusId, toStatusId, isActive: requestedActive ? 1 : 0 });
    await audit(req, "CONFIGURATION_UPDATED", "workflow_transition", id);
    return res.json({ status: true, data: { id } });
  } catch (error) { return sendError(res, error, "Failed to save transition"); }
};

const saveRoutingRule = async (req, res) => {
  try {
    const id = req.params.id ? positiveId(req.params.id) : null;
    const matchType = requiredText(req.body.matchType, "Match type", 20);
    if (!new Set(["category", "department", "location", "fallback"]).has(matchType)) throw Object.assign(new Error("Invalid match type"), { statusCode: 400 });
    const matchValue = matchType === "fallback" ? null : requiredText(req.body.matchValue, "Match value", 100);
    const rule = {
      name: requiredText(req.body.name, "Rule name"), matchType, matchValue,
      departmentId: positiveId(req.body.departmentId, "destination department"),
      officerId: req.body.officerId ? positiveId(req.body.officerId, "officer") : null,
      priority: Math.max(1, Number.parseInt(req.body.priority, 10) || 100),
      isActive: req.body.isActive !== false,
    };
    const ruleId = id
      ? (await ConfigurationModel.updateRoutingRule(id, rule) ? id : null)
      : await ConfigurationModel.createRoutingRule(rule, req.user.id);
    if (!ruleId) return res.status(404).json({ status: false, message: "Routing rule not found" });
    await audit(req, "CONFIGURATION_UPDATED", "routing_rule", ruleId);
    return res.status(id ? 200 : 201).json({ status: true, data: { id: ruleId } });
  } catch (error) { return sendError(res, error, "Failed to save routing rule"); }
};

const deactivateRoutingRule = async (req, res) => {
  try {
    const id = positiveId(req.params.id);
    if (!await ConfigurationModel.deactivateRoutingRule(id)) return res.status(404).json({ status: false, message: "Routing rule not found" });
    await audit(req, "CONFIGURATION_UPDATED", "routing_rule", id);
    return res.json({ status: true, message: "Routing rule deactivated" });
  } catch (error) { return sendError(res, error, "Failed to deactivate routing rule"); }
};

const saveHoliday = async (req, res) => {
  try {
    const date = requiredText(req.body.date, "Holiday date", 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw Object.assign(new Error("Holiday date must use YYYY-MM-DD"), { statusCode: 400 });
    const id = await ConfigurationModel.saveHoliday({
      id: req.params.id ? positiveId(req.params.id) : null,
      date, name: requiredText(req.body.name, "Holiday name"), isActive: req.body.isActive !== false,
    });
    if (!id) return res.status(404).json({ status: false, message: "Holiday not found" });
    await audit(req, "CONFIGURATION_UPDATED", "public_holiday", id);
    return res.status(req.params.id ? 200 : 201).json({ status: true, data: { id } });
  } catch (error) { return sendError(res, error, "Failed to save holiday"); }
};

const deactivateHoliday = async (req, res) => {
  try {
    const id = positiveId(req.params.id);
    if (!await ConfigurationModel.deactivateHoliday(id)) return res.status(404).json({ status: false, message: "Holiday not found" });
    await audit(req, "CONFIGURATION_UPDATED", "public_holiday", id);
    return res.json({ status: true, message: "Holiday deactivated" });
  } catch (error) { return sendError(res, error, "Failed to deactivate holiday"); }
};

module.exports = { deactivateCatalogItem, deactivateHoliday, deactivateRoutingRule, deactivateWorkflowItem, getConfiguration, getPublicCatalog, saveCatalogItem, saveCategoryMappings, saveHoliday, savePriority, saveRoutingRule, saveStatus, saveTransition };
