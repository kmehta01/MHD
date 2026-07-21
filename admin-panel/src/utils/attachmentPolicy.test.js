import { describe, expect, it } from "vitest";
import { buildAttachmentPolicy } from "./attachmentPolicy";

const types = [
  { key: "DOCX", label: "Word document", extensions: [".docx"], mimeTypes: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"] },
  { key: "PDF", label: "PDF", extensions: [".pdf"], mimeTypes: ["application/pdf"] },
];

describe("administrative attachment policies", () => {
  it("keeps intake and resolution selections independent", () => {
    const intake = buildAttachmentPolicy({ types, allowedTypeKeys: ["PDF"], maximumFiles: 3, maximumSizeMb: 5 });
    const resolution = buildAttachmentPolicy({ types, allowedTypeKeys: ["DOCX"], maximumFiles: 1, maximumSizeMb: 2 });
    expect(intake.accept).toBe(".pdf");
    expect(resolution.accept).toBe(".docx");
    expect(resolution.maximumFiles).toBe(1);
    expect(resolution.maximumSizeMb).toBe(2);
  });

  it("requires matching extension and MIME metadata", () => {
    const policy = buildAttachmentPolicy({ types, allowedTypeKeys: ["PDF"] });
    expect(policy.accepts({ name: "report.pdf", type: "application/pdf" })).toBe(true);
    expect(policy.accepts({ name: "report.docx", type: "application/pdf" })).toBe(false);
  });
});
