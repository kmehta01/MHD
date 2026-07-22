const assert = require("node:assert/strict");
const test = require("node:test");
const db = require("../src/config/db");
const DirectoryModel = require("../src/models/site-directory.model");

test.after(async () => db.end());

test("public directory groups active contacts and publishes supported social icon metadata", async () => {
  const original = db.query;
  db.query = async (sql) => {
    if (sql.includes("FROM departments d")) return [[{
      id: 2, code: "CR", name: "Internal name", public_display_name: "Public name",
      public_address: "Address", public_summary: null, public_icon_key: "building",
      public_sort_order: 10, show_in_public_directory: 1, is_active: 1,
    }]];
    if (sql.includes("department_public_contacts")) return [[{
      id: 3, department_id: 2, contact_key: "email", contact_type: "email", label: "Email",
      display_value: "office@example.test", link_value: "office@example.test", sort_order: 10, is_active: 1,
    }]];
    if (sql.includes("FROM public_facilities f")) return [[]];
    if (sql.includes("facility_public_contacts")) return [[]];
    if (sql.includes("public_social_links")) return [[{
      id: 4, platform_key: "youtube", label: "Videos", url: "https://youtube.com/example", sort_order: 5, is_active: 1,
    }]];
    return [[]];
  };
  try {
    const data = await DirectoryModel.listDirectory({ activeOnly: true });
    assert.equal(data.departments[0].name, "Public name");
    assert.equal(data.departments[0].contacts[0].displayValue, "office@example.test");
    assert.equal(data.socialLinks[0].iconKey, "youtube");
    assert.equal("operationalName" in data.departments[0], false);
  } finally { db.query = original; }
});
