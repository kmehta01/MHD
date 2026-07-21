const assert = require("node:assert/strict");
const test = require("node:test");
const ConfigurationModel = require("../src/models/configuration.model");
const controller = require("../src/controllers/configuration.controller");

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
