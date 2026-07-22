const assert = require("node:assert/strict");
const test = require("node:test");
const db = require("../src/config/db");
const ConfigurationModel = require("../src/models/configuration.model");
const controller = require("../src/controllers/configuration.controller");
const AuditLogService = require("../src/services/audit-log.service");
const TicketSettingsService = require("../src/services/ticket-settings.service");

test.after(async () => db.end());

const response = () => ({
  statusCode: 200, body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

test("status updates keep the immutable key out of the model mutation", async (t) => {
  let saved;
  t.mock.method(ConfigurationModel, "saveStatus", async (item) => { saved = item; return null; });
  t.mock.method(ConfigurationModel, "getDeactivationDependencies", async () => ({}));
  const res = response();
  await controller.saveStatus({
    params: { id: "7" }, user: { id: 1 }, body: {
      key: "attempted_rewrite", name: "Renamed", reportingGroup: "open",
      notificationEvent: "status_change", isFinal: false, isActive: true, sortOrder: 25,
    },
  }, res);
  assert.equal(res.statusCode, 404);
  assert.equal(saved.key, undefined);
  assert.equal(saved.name, "Renamed");
});

test("deactivation returns dependency counts with HTTP 409", async (t) => {
  t.mock.method(ConfigurationModel, "getDeactivationDependencies", async () => ({ activeComplaints: 3 }));
  const res = response();
  await controller.deactivateCatalogItem({ params: { catalog: "categories", id: "4" } }, res);
  assert.equal(res.statusCode, 409);
  assert.deepEqual(res.body.dependencies, { activeComplaints: 3 });
});

test("category mappings reject inactive departments", async (t) => {
  t.mock.method(ConfigurationModel, "findActiveCatalogItem", async (table) => table === "complaint_categories" ? { id: 2 } : null);
  const res = response();
  await controller.saveCategoryMappings({ params: { id: "2" }, body: { departmentIds: [9] } }, res);
  assert.equal(res.statusCode, 400);
});

test("workflow transitions require two active status IDs", async (t) => {
  t.mock.method(ConfigurationModel, "listWorkflow", async () => ({ statuses: [{ id: 1, is_active: 1 }] }));
  const res = response();
  await controller.saveTransition({ body: { fromStatusId: 1, toStatusId: 2, isActive: true } }, res);
  assert.equal(res.statusCode, 400);
});

test("form-option updates preserve immutable key and group", async (t) => {
  let saved;
  t.mock.method(AuditLogService, "recordAuditEvent", async () => null);
  t.mock.method(ConfigurationModel, "getFormOption", async () => ({ id: 12, option_group: "assistance", option_key: "large_print" }));
  t.mock.method(ConfigurationModel, "saveFormOption", async (item) => { saved = item; return 12; });
  const res = response();
  await controller.saveFormOption({
    params: { id: "12" }, user: { id: 1 }, body: {
      group: "assistance", key: "attempted_rewrite", label: "Accessible large print",
      helpText: "Available on request", sortOrder: 5, isActive: true,
    },
  }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(saved.key, undefined);
  assert.equal(saved.group, "assistance");
  assert.equal(saved.label, "Accessible large print");
});

test("form-option updates reject changing the immutable group", async (t) => {
  t.mock.method(ConfigurationModel, "getFormOption", async () => ({ id: 12, option_group: "assistance" }));
  const res = response();
  await controller.saveFormOption({
    params: { id: "12" }, body: { group: "accommodation", label: "Moved option", isActive: true },
  }, res);
  assert.equal(res.statusCode, 409);
  assert.match(res.body.message, /groups are immutable/i);
});

test("form-option deactivation protects the last required choice", async (t) => {
  t.mock.method(ConfigurationModel, "getFormOptionDeactivationDependencies", async () => ({
    requiredGroup: true, remainingActive: 0,
  }));
  const res = response();
  await controller.deactivateFormOption({ params: { id: "8" } }, res);
  assert.equal(res.statusCode, 409);
  assert.deepEqual(res.body.dependencies, { remainingActive: 0 });
});

test("intake-classification updates preserve immutable keys", async (t) => {
  let saved;
  t.mock.method(AuditLogService, "recordAuditEvent", async () => null);
  t.mock.method(ConfigurationModel, "getIntakeClassification", async () => ({ id: 4, classification_key: "level_4" }));
  t.mock.method(ConfigurationModel, "saveIntakeClassification", async (item) => { saved = item; return 4; });
  const res = response();
  await controller.saveIntakeClassification({
    params: { id: "4" }, user: { id: 1 },
    body: { key: "rewritten", name: "Urgent review", helpText: "Same behavior", sortOrder: 5, isActive: true },
  }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(saved.key, undefined);
  assert.equal(saved.name, "Urgent review");
});

test("intake-classification deactivation reports active grievance dependencies", async (t) => {
  t.mock.method(ConfigurationModel, "getIntakeClassification", async () => ({ id: 2 }));
  t.mock.method(ConfigurationModel, "getIntakeClassificationDependencies", async () => ({ activeComplaints: 2 }));
  const res = response();
  await controller.deactivateIntakeClassification({ params: { id: "2" } }, res);
  assert.equal(res.statusCode, 409);
  assert.deepEqual(res.body.dependencies, { activeComplaints: 2 });
});

test("public catalog adds only a synthetic ticket example and tolerates example failure", async (t) => {
  t.mock.method(ConfigurationModel, "listPublicCatalog", async () => ({ categories: [], locations: [], departments: [], formOptions: {} }));
  t.mock.method(TicketSettingsService, "getPublicExample", async () => "CASE-2030-0001");
  const available = response();
  await controller.getPublicCatalog({}, available);
  assert.equal(available.body.data.ticketNumberExample, "CASE-2030-0001");
  assert.equal(Object.hasOwn(available.body.data, "currentSequence"), false);
  assert.equal(Object.hasOwn(available.body.data, "nextSequence"), false);

  TicketSettingsService.getPublicExample.mock.mockImplementation(async () => { throw new Error("Unavailable"); });
  const unavailable = response();
  await controller.getPublicCatalog({}, unavailable);
  assert.equal(unavailable.statusCode, 200);
  assert.equal(unavailable.body.data.ticketNumberExample, null);
});
