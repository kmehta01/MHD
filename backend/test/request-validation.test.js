const test = require("node:test");
const assert = require("node:assert/strict");
const {
  getOptionalInteger,
  getOptionalString,
} = require("../src/utils/request-validation");

test("accepts bounded scalar query parameters", () => {
  const query = { page: "2", search: "  delayed service  " };

  assert.equal(getOptionalInteger(query, "page", { maximum: 100 }), 2);
  assert.equal(
    getOptionalString(query, "search", { maxLength: 100 }),
    "delayed service",
  );
});

test("rejects arrays and objects where scalar query values are required", () => {
  assert.throws(
    () => getOptionalString({ search: ["first", "second"] }, "search"),
    /single string value/,
  );
  assert.throws(
    () => getOptionalString({ search: { nested: "value" } }, "search"),
    /single string value/,
  );
  assert.throws(
    () => getOptionalInteger({ page: ["1", "2"] }, "page"),
    /single string value/,
  );
});

test("rejects oversized and out-of-range query values", () => {
  assert.throws(
    () => getOptionalString({ search: "x".repeat(101) }, "search", {
      maxLength: 100,
    }),
    /100 characters or fewer/,
  );
  assert.throws(
    () => getOptionalInteger({ per_page: "101" }, "per_page", {
      maximum: 100,
    }),
    /outside the allowed range/,
  );
});
