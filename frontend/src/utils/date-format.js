export const formatPortalDateTime = (value, portal, language = "English") => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const locale = language === "Spanish" ? "es-BZ" : "en-BZ";
  const parts = new Intl.DateTimeFormat(locale, {
    timeZone: portal.timeZone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: portal.timeFormat === "12 Hour",
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value || "";
  const datePart = portal.dateFormat === "MM/DD/YYYY" ? `${get("month")}/${get("day")}/${get("year")}`
    : portal.dateFormat === "YYYY-MM-DD" ? `${get("year")}-${get("month")}-${get("day")}`
      : `${get("day")}/${get("month")}/${get("year")}`;
  return `${datePart} ${get("hour")}:${get("minute")}${portal.timeFormat === "12 Hour" ? ` ${get("dayPeriod")}` : ""}`.trim();
};
