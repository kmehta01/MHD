const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const ExcelJS = require("exceljs");
const { createExcel, formatPortalDateTime } = require("../src/services/report.service");

test("report timestamps honor configured date, time, and time-zone formats", () => {
  const value = "2026-07-21T18:05:00.000Z";
  assert.equal(formatPortalDateTime(value, {
    dateFormat: "YYYY-MM-DD", timeFormat: "24 Hour", timeZone: "America/Belize",
  }), "2026-07-21 12:05");
  assert.match(formatPortalDateTime(value, {
    dateFormat: "MM/DD/YYYY", timeFormat: "12 Hour", timeZone: "Asia/Kolkata",
  }), /^07\/21\/2026 11:35 PM$/i);
});

test("creates a readable XLSX report with the overridden Excel dependencies", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "mhd-report-test-"));
  const filePath = path.join(directory, "report.xlsx");
  try {
    await createExcel({
      filePath,
      rows: [{ token_number: "GRM-2026-0001" }],
      columns: [["Ticket Number", "token_number"]],
      headers: ["Grievance Report"],
    });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    assert.equal(workbook.getWorksheet("Grievances").getCell("A4").value, "GRM-2026-0001");
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
