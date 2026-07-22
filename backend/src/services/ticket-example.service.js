const db = require("../config/db");
const { buildTicketNumber } = require("../utils/ticket-format-parser");
const { getTicketDateParts } = require("../utils/ticket-period-helper");

const segmentToggles = Object.freeze({
  includeYear: false,
  includeMonth: false,
  includeDay: false,
  includeDepartmentCode: false,
  includeLocationCode: false,
  includeCategoryCode: false,
});

const TICKET_FORMAT_PRESETS = Object.freeze([
  { key: "standard", name: "Standard", format: "{PREFIX}-{YEAR}-{SEQUENCE}", toggles: { ...segmentToggles, includeYear: true } },
  { key: "monthly", name: "Monthly", format: "{PREFIX}-{YEAR}{MONTH}-{SEQUENCE}", toggles: { ...segmentToggles, includeYear: true, includeMonth: true } },
  { key: "department", name: "Department-Based", format: "{PREFIX}-{DEPARTMENT}-{YEAR}-{SEQUENCE}", toggles: { ...segmentToggles, includeYear: true, includeDepartmentCode: true } },
  { key: "location", name: "Location-Based", format: "{PREFIX}-{LOCATION}-{YEAR}-{SEQUENCE}", toggles: { ...segmentToggles, includeYear: true, includeLocationCode: true } },
  { key: "department_location", name: "Department and Location", format: "{PREFIX}-{LOCATION}-{DEPARTMENT}-{YEAR}-{SEQUENCE}", toggles: { ...segmentToggles, includeYear: true, includeLocationCode: true, includeDepartmentCode: true } },
]);

const firstActive = async (executor, table) => {
  const [rows] = await executor.query(
    `SELECT id, code, name FROM ${table} WHERE is_active=1 ORDER BY id ASC LIMIT 1`,
  );
  return rows[0] || null;
};

const loadTicketSampleContext = async (executor = db) => {
  const [department, location, category] = await Promise.all([
    firstActive(executor, "departments"),
    firstActive(executor, "complaint_locations"),
    firstActive(executor, "complaint_categories"),
  ]);
  return {
    departmentCode: department?.code || "",
    departmentLabel: department?.name || "",
    locationCode: location?.code || "",
    locationLabel: location?.name || "",
    categoryCode: category?.code || "",
    categoryLabel: category?.name || "",
  };
};

const tryBuildTicketExample = ({ settings, sequence, context, date, timeZone }) => {
  try {
    return { value: buildTicketNumber({ settings, sequence, context, date, timeZone }), warning: null };
  } catch (error) {
    if (error.code !== "TICKET_CONTEXT_REQUIRED") throw error;
    return { value: null, warning: error.message };
  }
};

const buildTicketFormatExamples = ({ settings, context, date, timeZone }) =>
  TICKET_FORMAT_PRESETS.map((preset) => {
    const exampleSettings = { ...settings, ...preset.toggles, ticketFormat: preset.format };
    const generated = tryBuildTicketExample({
      settings: exampleSettings,
      sequence: settings.startingSequence,
      context,
      date,
      timeZone,
    });
    return { ...preset, sample: generated.value, warning: generated.warning };
  });

const serializeTicketSampleContext = (context, date, timeZone) => ({
  date: getTicketDateParts(date, timeZone),
  timeZone,
  department: context.departmentCode ? { code: context.departmentCode, label: context.departmentLabel } : null,
  location: context.locationCode ? { code: context.locationCode, label: context.locationLabel } : null,
  category: context.categoryCode ? { code: context.categoryCode, label: context.categoryLabel } : null,
});

module.exports = {
  TICKET_FORMAT_PRESETS,
  buildTicketFormatExamples,
  loadTicketSampleContext,
  serializeTicketSampleContext,
  tryBuildTicketExample,
};
