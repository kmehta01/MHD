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

const sendError = (res, error, fallback) => res.status(error.statusCode || 500).json({
  status: false,
  message: error.statusCode ? error.message : fallback,
  error: process.env.NODE_ENV === "development" && !error.statusCode ? error.message : undefined,
});

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
    const [categories, locations, holidays, routingRules, workflow, officers, publicCatalog] = await Promise.all([
      ConfigurationModel.listCatalog("categories"), ConfigurationModel.listCatalog("locations"),
      ConfigurationModel.listHolidays(), ConfigurationModel.listRoutingRules(),
      ConfigurationModel.listWorkflow(), ConfigurationModel.listAssignableOfficers(),
      ConfigurationModel.listPublicCatalog(),
    ]);
    return res.json({ status: true, data: { categories, locations, departments: publicCatalog.departments, holidays, routingRules, workflow, officers } });
  } catch (error) { return sendError(res, error, "Failed to load configuration"); }
};

const saveCatalogItem = async (req, res) => {
  try {
    const catalog = String(req.params.catalog || "");
    const id = req.params.id ? positiveId(req.params.id) : null;
    const itemId = await ConfigurationModel.saveCatalogItem(catalog, {
      id,
      code: requiredText(req.body.code, "Code", 40).toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, ""),
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
    if (!await ConfigurationModel.deactivateCatalogItem(req.params.catalog, id)) return res.status(404).json({ status: false, message: "Catalog item not found" });
    await audit(req, "CONFIGURATION_UPDATED", req.params.catalog, id);
    return res.json({ status: true, message: "Catalog item deactivated" });
  } catch (error) { return sendError(res, error, "Failed to deactivate catalog item"); }
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

module.exports = { deactivateCatalogItem, deactivateHoliday, deactivateRoutingRule, getConfiguration, getPublicCatalog, saveCatalogItem, saveHoliday, saveRoutingRule };
