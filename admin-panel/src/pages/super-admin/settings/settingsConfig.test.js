import { describe, expect, it } from "vitest";
import { settingsSections } from "./settingsConfig";

describe("Email & SMTP General Settings", () => {
  it("shows private email identity fields and SMTP readiness guidance", () => {
    const section = settingsSections.find((item) => item.id === "email");
    expect(section).toBeTruthy();
    expect(section.runtimeCapability).toBe("email");
    expect(section.runtimeHelp).toMatch(/environment variables/i);
    expect(section.fields.map((field) => field.key)).toEqual([
      "subjectPrefix", "replyToAddress", "footerText",
    ]);
    expect(section.fields.find((field) => field.key === "replyToAddress")?.type).toBe("email");
  });
});

describe("Portal timezone settings", () => {
  it("explains ticket date and sequence-boundary effects", () => {
    const portal = settingsSections.find((item) => item.id === "portal");
    const timeZone = portal.fields.find((field) => field.key === "timeZone");
    expect(timeZone.help).toMatch(/ticket date segments/i);
    expect(timeZone.help).toMatch(/sequence boundaries/i);
  });
});
