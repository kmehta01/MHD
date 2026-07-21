import { describe, expect, it } from "vitest";
import { hasRequiredGrievanceFormOptions, normalizeGrievanceFormOptions, reconcileGrievanceFormSelections } from "./grievanceFormOptions";

const options = {
  assistance: [{ key: "renamed", label: "Renamed assistance", helpText: "Configured help", isActive: true }],
  contactPreferences: [{ key: "callback", label: "Call me", contactRequirement: "phone", isActive: true }],
  submissionChannels: [{ key: "portal", label: "Web portal", sortOrder: 5, isActive: true }],
  accommodations: [{ key: "inactive", label: "Inactive", isActive: false }],
};

describe("grievance form configuration", () => {
  it("preserves backend labels, help text, order, and behavior metadata", () => {
    const normalized = normalizeGrievanceFormOptions(options);
    expect(normalized.assistance[0]).toMatchObject({ label: "Renamed assistance", helpText: "Configured help" });
    expect(normalized.contactPreferences[0].contactRequirement).toBe("phone");
    expect(normalized.submissionChannels[0].key).toBe("portal");
    expect(normalized.accommodations).toEqual([]);
  });

  it("clears selections that are no longer available", () => {
    expect(reconcileGrievanceFormSelections({ assistance: ["missing"], channel: ["portal", "missing"], accommodation: ["inactive"], contact_pref: "missing" }, options))
      .toMatchObject({ assistance: [], channel: ["portal"], accommodation: [], contact_pref: "" });
  });

  it("blocks submission when either required group is empty", () => {
    expect(hasRequiredGrievanceFormOptions(options)).toBe(true);
    expect(hasRequiredGrievanceFormOptions({ ...options, submissionChannels: [] })).toBe(false);
  });
});
