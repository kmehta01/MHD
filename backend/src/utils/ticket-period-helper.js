const TICKET_TIME_ZONE = "America/Belize";

const getTicketDateParts = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TICKET_TIME_ZONE,
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

const getTicketPeriod = ({ prefix, sequenceReset, date = new Date() }) => {
  const parts = getTicketDateParts(date);
  const normalizedPrefix = String(prefix || "GRM").toUpperCase();
  const reset = String(sequenceReset || "yearly").toLowerCase();

  if (reset === "daily") {
    const period = `${parts.year}-${parts.month}-${parts.day}`;
    return { key: `${normalizedPrefix}:${period}`, label: period, start: period, end: period, parts };
  }
  if (reset === "monthly") {
    const period = `${parts.year}-${parts.month}`;
    return { key: `${normalizedPrefix}:${period}`, label: period, start: `${period}-01`, end: getPeriodEnd(parts, reset), parts };
  }
  if (reset === "yearly") {
    return { key: `${normalizedPrefix}:${parts.year}`, label: parts.year, start: `${parts.year}-01-01`, end: getPeriodEnd(parts, reset), parts };
  }
  return { key: `${normalizedPrefix}:NEVER`, label: "Never", start: null, end: null, parts };
};

module.exports = { getTicketDateParts, getTicketPeriod, TICKET_TIME_ZONE };
