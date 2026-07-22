const requireTicketTimeZone = (value) => {
  const timeZone = String(value || "").trim();
  if (!timeZone) {
    const error = new Error("Portal timezone is required for ticket processing");
    error.code = "TICKET_TIME_ZONE_REQUIRED";
    throw error;
  }
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone }).format();
  } catch {
    const error = new Error("Portal timezone is invalid for ticket processing");
    error.code = "TICKET_TIME_ZONE_INVALID";
    throw error;
  }
  return timeZone;
};

const getTicketDateParts = (date = new Date(), configuredTimeZone) => {
  const timeZone = requireTicketTimeZone(configuredTimeZone);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return { year: get("year"), month: get("month"), day: get("day") };
};

const getPeriodEnd = ({ year, month, day }, reset) => {
  if (reset === "daily") return `${year}-${month}-${day}`;
  if (reset === "monthly") {
    const lastDay = new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate();
    return `${year}-${month}-${String(lastDay).padStart(2, "0")}`;
  }
  if (reset === "yearly") return `${year}-12-31`;
  return null;
};

const getTicketPeriod = ({ prefix, sequenceReset, date = new Date(), timeZone }) => {
  const parts = getTicketDateParts(date, timeZone);
  const normalizedPrefix = String(prefix || "GRM").toUpperCase();
  const reset = String(sequenceReset || "yearly").toLowerCase();

  if (reset === "daily") {
    const period = `${parts.year}-${parts.month}-${parts.day}`;
    return { key: `${normalizedPrefix}:${period}`, label: period, start: period, end: period, parts, timeZone };
  }
  if (reset === "monthly") {
    const period = `${parts.year}-${parts.month}`;
    return { key: `${normalizedPrefix}:${period}`, label: period, start: `${period}-01`, end: getPeriodEnd(parts, reset), parts, timeZone };
  }
  if (reset === "yearly") {
    return { key: `${normalizedPrefix}:${parts.year}`, label: parts.year, start: `${parts.year}-01-01`, end: getPeriodEnd(parts, reset), parts, timeZone };
  }
  return { key: `${normalizedPrefix}:NEVER`, label: "Never", start: null, end: null, parts, timeZone };
};

module.exports = { getTicketDateParts, getTicketPeriod, requireTicketTimeZone };
