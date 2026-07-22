import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FormatExamples from "./FormatExamples";

describe("FormatExamples", () => {
  it("renders server samples, applies complete presets, and disables unavailable samples", () => {
    const onApply = vi.fn();
    const examples = [
      { key: "standard", name: "Standard", format: "{PREFIX}-{YEAR}-{SEQUENCE}", sample: "CASE-2031-0001", warning: null, toggles: { includeYear: true, includeMonth: false } },
      { key: "department", name: "Department", format: "{PREFIX}-{DEPARTMENT}-{SEQUENCE}", sample: null, warning: "Department code is required", toggles: { includeDepartmentCode: true } },
    ];
    render(<FormatExamples examples={examples} onApply={onApply} />);
    expect(screen.getByText("CASE-2031-0001")).toBeInTheDocument();
    expect(screen.getByText("Department code is required")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Department/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /Standard/ }));
    expect(onApply).toHaveBeenCalledWith(examples[0]);
  });
});
