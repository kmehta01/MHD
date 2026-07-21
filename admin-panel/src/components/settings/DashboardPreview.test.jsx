import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DashboardPreview from "./DashboardPreview";

describe("DashboardPreview", () => {
  it("renders only dashboard cards and charts enabled by General Settings", () => {
    render(<DashboardPreview settings={{
      showTotalGrievances: true,
      showNewGrievances: false,
      showUnassignedGrievances: false,
      showInProgressGrievances: false,
      showResolvedGrievances: false,
      showOverdueGrievances: false,
      showStatusDistributionChart: true,
      showMonthlyTrendChart: false,
    }} />);

    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.queryByText("New")).not.toBeInTheDocument();
    expect(screen.getByText("Status distribution")).toBeInTheDocument();
    expect(screen.queryByText("Monthly trend")).not.toBeInTheDocument();
  });

  it("shows an empty state when every summary card is disabled", () => {
    render(<DashboardPreview settings={{}} />);
    expect(screen.getByText("No summary cards selected.")).toBeInTheDocument();
  });
});
