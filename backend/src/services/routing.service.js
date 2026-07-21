const ConfigurationModel = require("../models/configuration.model");

const methodMatchTypes = {
  Automatic: ["category", "department", "location", "fallback"],
  "Category-Based": ["category", "fallback"],
  "Department-Based": ["department", "fallback"],
  "Location-Based": ["location", "fallback"],
};

const resolveInitialRouting = async ({ settings, categoryId, submittedDepartmentId, locationId }) => {
  const method = settings.assignment.defaultAssignmentMethod;
  if (method === "Manual") return { departmentId: null, officerId: null, ruleId: null };
  if (method === "Department-Based" && submittedDepartmentId) {
    return { departmentId: submittedDepartmentId, officerId: null, ruleId: null };
  }
  const rule = await ConfigurationModel.findRoutingRule({
    matchTypes: methodMatchTypes[method] || ["fallback"],
    categoryId, departmentId: submittedDepartmentId, locationId,
  });
  return {
    departmentId: rule?.destination_department_id || null,
    officerId: rule?.assigned_officer_id || null,
    ruleId: rule?.id || null,
  };
};

module.exports = { methodMatchTypes, resolveInitialRouting };
