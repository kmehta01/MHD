import { describe, expect, it } from "vitest";
import { buildAttachmentPolicy } from "./attachmentPolicy";

const types = [
  { key: "PDF", label: "PDF document", extensions: [".pdf"], mimeTypes: ["application/pdf"] },
  { key: "PNG", label: "PNG image", extensions: [".png"], mimeTypes: ["image/png"] },
];

describe("public attachment policy", () => {
  it("derives browser guidance and validation from API capability metadata", () => {
    const policy = buildAttachmentPolicy({ types, allowedTypeKeys: ["PNG"], maximumFiles: 2, maximumSizeMb: 4 });
    expect(policy.accept).toBe(".png");
    expect(policy.allowedLabels).toEqual(["PNG image"]);
    expect(policy.maximumFiles).toBe(2);
    expect(policy.maximumSizeBytes).toBe(4 * 1024 * 1024);
    expect(policy.accepts({ name: "image.png", type: "image/png" })).toBe(true);
    expect(policy.accepts({ name: "spoof.pdf", type: "image/png" })).toBe(false);
  });

  it("fails closed when settings contain an unknown key", () => {
    expect(buildAttachmentPolicy({ types, allowedTypeKeys: ["EXE"] }).allowedTypes).toEqual([]);
  });
});
