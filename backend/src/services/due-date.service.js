let defaultExecutor;
const getDefaultExecutor = () => {
  defaultExecutor ||= require("../config/db");
  return defaultExecutor;
};

const requireDueDatePolicy = (settings) => {
  if (!settings?.dueDate || !settings?.portal?.timeZone) {
    throw new TypeError("Runtime General Settings are required for due-date calculation");
  }
  return {
    duePolicy: settings.dueDate,
    timeZone: settings.portal.timeZone,
  };
};

const getZonedParts = (value, timeZone) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new TypeError("A valid date is required");
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const numberPart = (type) => Number(parts.find((part) => part.type === type)?.value);
  return {
    year: numberPart("year"), month: numberPart("month"), day: numberPart("day"),
    hour: numberPart("hour"), minute: numberPart("minute"), second: numberPart("second"),
  };
};

const zonedPartsToDate = (parts, timeZone) => {
  const target = Date.UTC(
    parts.year, parts.month - 1, parts.day,
    parts.hour, parts.minute, parts.second,
  );
  let candidate = new Date(target);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const actual = getZonedParts(candidate, timeZone);
    const represented = Date.UTC(
      actual.year, actual.month - 1, actual.day,
      actual.hour, actual.minute, actual.second,
    );
    const adjustment = target - represented;
    if (adjustment === 0) return candidate;
    candidate = new Date(candidate.getTime() + adjustment);
  }
  return candidate;
};

const addPlainDays = (parts, days) => {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return {
    ...parts,
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
};

const dateKey = (parts) =>
  `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;

const weekday = (parts) =>
  new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();

const normalizeHolidayKey = (value) => {
  if (typeof value === "string") {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return null;
};

const getActiveHolidayKeys = async (executor) => {
  const [rows] = await (executor || getDefaultExecutor()).query(
    `SELECT DATE_FORMAT(holiday_date, '%Y-%m-%d') AS holiday_key
     FROM public_holidays
     WHERE is_active = 1`,
  );
  return new Set(rows
    .map((row) => normalizeHolidayKey(row.holiday_key ?? row.holiday_date))
    .filter(Boolean));
};

const isEligibleParts = (parts, duePolicy, holidayKeys) => {
  const day = weekday(parts);
  if (duePolicy.countWorkingDaysOnly && (day === 0 || day === 6)) return false;
  if (duePolicy.excludePublicHolidays && holidayKeys.has(dateKey(parts))) return false;
  return true;
};

const shiftPolicyDays = ({ date, days, direction = 1, settings, holidayKeys = new Set() }) => {
  const { duePolicy, timeZone } = requireDueDatePolicy(settings);
  const count = Number(days);
  if (!Number.isInteger(count) || count < 0) {
    throw new TypeError("Policy day count must be a non-negative integer");
  }
  if (![1, -1].includes(direction)) throw new TypeError("Direction must be 1 or -1");

  let parts = getZonedParts(date, timeZone);
  let counted = 0;
  let attempts = 0;
  while (counted < count) {
    parts = addPlainDays(parts, direction);
    if (isEligibleParts(parts, duePolicy, holidayKeys)) counted += 1;
    attempts += 1;
    if (attempts > 100000) throw new Error("Due-date calendar could not find an eligible date");
  }
  return zonedPartsToDate(parts, timeZone);
};

const parsePortalDateTime = (value, timeZone, { defaultHour = 12 } = {}) => {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) throw new TypeError("A valid date is required");
    return new Date(value.getTime());
  }
  const text = String(value || "").trim();
  const local = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (local) {
    const parts = {
      year: Number(local[1]), month: Number(local[2]), day: Number(local[3]),
      hour: local[4] === undefined ? defaultHour : Number(local[4]),
      minute: local[5] === undefined ? 0 : Number(local[5]),
      second: local[6] === undefined ? 0 : Number(local[6]),
    };
    const parsed = zonedPartsToDate(parts, timeZone);
    const represented = getZonedParts(parsed, timeZone);
    if (Object.keys(parts).some((key) => represented[key] !== parts[key])) {
      throw new TypeError("The date and time is not valid in the portal timezone");
    }
    return parsed;
  }
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) throw new TypeError("A valid date is required");
  return parsed;
};

const createPolicyCalendar = async ({ settings, executor, holidayKeys } = {}) => {
  const { duePolicy, timeZone } = requireDueDatePolicy(settings);
  const holidays = holidayKeys || (duePolicy.dueDateRequired && duePolicy.excludePublicHolidays
    ? await getActiveHolidayKeys(executor)
    : new Set());
  const shift = (date, days, direction = 1) => shiftPolicyDays({
    date, days, direction, settings, holidayKeys: holidays,
  });

  return {
    settings,
    duePolicy,
    timeZone,
    holidayKeys: holidays,
    addDays: (date, days) => shift(date, days, 1),
    subtractDays: (date, days) => shift(date, days, -1),
    calculateDueAt: (startDate) => (
      duePolicy.dueDateRequired ? shift(startDate, duePolicy.defaultResolutionDays, 1) : null
    ),
    calculateReminderAt: (dueAt) => shift(dueAt, duePolicy.dueDateReminderDays, -1),
    calculateEscalationAt: (dueAt) => shift(dueAt, duePolicy.escalateAfterDays, 1),
    isEligibleDate: (date) => isEligibleParts(getZonedParts(date, timeZone), duePolicy, holidays),
  };
};

const calculateDueAt = async ({ startDate = new Date(), settings, executor, holidayKeys }) => {
  const calendar = await createPolicyCalendar({ settings, executor, holidayKeys });
  return calendar.calculateDueAt(startDate);
};

const calculateReminderAt = async ({ dueAt, settings, executor, holidayKeys }) => {
  const calendar = await createPolicyCalendar({ settings, executor, holidayKeys });
  return calendar.calculateReminderAt(dueAt);
};

const calculateEscalationAt = async ({ dueAt, settings, executor, holidayKeys }) => {
  const calendar = await createPolicyCalendar({ settings, executor, holidayKeys });
  return calendar.calculateEscalationAt(dueAt);
};

module.exports = {
  addPlainDays,
  calculateDueAt,
  calculateEscalationAt,
  calculateReminderAt,
  createPolicyCalendar,
  dateKey,
  getActiveHolidayKeys,
  getZonedParts,
  normalizeHolidayKey,
  parsePortalDateTime,
  requireDueDatePolicy,
  shiftPolicyDays,
  weekday,
  zonedPartsToDate,
};
