const db = require("../config/db");

const getZonedParts = (date, timeZone) => {
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
  const value = (type) => Number(parts.find((part) => part.type === type)?.value);
  return {
    year: value("year"), month: value("month"), day: value("day"),
    hour: value("hour"), minute: value("minute"), second: value("second"),
  };
};

const zonedPartsToDate = (parts, timeZone) => {
  const target = Date.UTC(
    parts.year, parts.month - 1, parts.day,
    parts.hour, parts.minute, parts.second,
  );
  let candidate = new Date(target);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const actual = getZonedParts(candidate, timeZone);
    const represented = Date.UTC(
      actual.year, actual.month - 1, actual.day,
      actual.hour, actual.minute, actual.second,
    );
    candidate = new Date(candidate.getTime() + target - represented);
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

const getActiveHolidayKeys = async (executor = db) => {
  const [rows] = await executor.query(
    `SELECT holiday_date FROM public_holidays WHERE is_active = 1`,
  );
  return new Set(rows.map((row) => String(row.holiday_date).slice(0, 10)));
};

const calculateDueAt = async ({ startDate = new Date(), settings, executor = db }) => {
  const duePolicy = settings.dueDate;
  if (!duePolicy.dueDateRequired) return null;

  const timeZone = settings.portal.timeZone;
  const holidays = duePolicy.excludePublicHolidays
    ? await getActiveHolidayKeys(executor)
    : new Set();
  let parts = getZonedParts(startDate, timeZone);
  let counted = 0;

  while (counted < duePolicy.defaultResolutionDays) {
    parts = addPlainDays(parts, 1);
    const day = weekday(parts);
    const weekend = duePolicy.countWorkingDaysOnly && (day === 0 || day === 6);
    const holiday = duePolicy.excludePublicHolidays && holidays.has(dateKey(parts));
    if (!weekend && !holiday) counted += 1;
  }

  return zonedPartsToDate(parts, timeZone);
};

module.exports = {
  addPlainDays,
  calculateDueAt,
  dateKey,
  getZonedParts,
  weekday,
  zonedPartsToDate,
};
