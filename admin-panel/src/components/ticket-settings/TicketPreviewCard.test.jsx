import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TicketPreviewCard from "./TicketPreviewCard";

describe("TicketPreviewCard", () => {
  it("displays the effective General Settings timezone", () => {
    render(<TicketPreviewCard preview={{ preview: "CASE-2030-0001", nextPreview: "CASE-2030-0002", sequencePeriod: "2030", timeZone: "Asia/Kolkata" }} settings={{ ticketFormat: "{PREFIX}-{YEAR}-{SEQUENCE}" }} />);
    expect(screen.getByText("Effective timezone:")).toBeInTheDocument();
    expect(screen.getByText("Asia/Kolkata")).toBeInTheDocument();
  });
});
