import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { buildDashboardGreeting, formatNavigationBadge } from "../utils/adminPresentation";
import API from "../services/api";
import { getAdminUser } from "../utils/permissions";

vi.mock("../services/api", () => ({ default: { get: vi.fn(), put: vi.fn() } }));

const branding = { organizationName: "Configured Agency", logo: "/logo.png" };
const renderSidebar = (user, counts) => {
  localStorage.setItem("admin_user", JSON.stringify(user));
  return render(<MemoryRouter><Sidebar branding={branding} isOpen navigationCounts={counts} onClose={vi.fn()} onLogout={vi.fn()} /></MemoryRouter>);
};

describe("admin navigation identity", () => {
  beforeEach(() => {
    localStorage.clear();
    API.get.mockReset();
    API.put.mockReset();
  });

  it("formats only positive authoritative badge counts", () => {
    expect(formatNavigationBadge(undefined)).toBeNull();
    expect(formatNavigationBadge(0)).toBeNull();
    expect(formatNavigationBadge(7)).toBe("7");
    expect(formatNavigationBadge(125)).toBe("99+");
  });

  it("shows the grievance badge for role navigation", () => {
    renderSidebar({ role_slug: "super-admin", permissions: [] }, { newGrievances: 125 });
    const grievanceSection = screen.getByRole("button", { name: /Grievance Management/ });
    expect(within(grievanceSection).getByText("99+")).toBeInTheDocument();
  });

  it("shows a grievance badge but no fabricated application badge for ministry navigation", () => {
    renderSidebar({
      role_slug: "ministry-user",
      permissions: ["applications.view", "grievances.view_department"],
      department_id: 2,
    }, { newGrievances: 5 });
    const grievances = screen.getByRole("link", { name: /Grievances/ });
    const applications = screen.getByRole("link", { name: "Applications" });
    expect(within(grievances).getByText("5")).toBeInTheDocument();
    expect(applications.querySelector(".nav-count")).toBeNull();
  });

  it("uses a neutral topbar identity when cached user JSON is malformed", () => {
    localStorage.setItem("admin_user", "not-json");
    expect(getAdminUser()).toBeNull();
    render(<MemoryRouter><Topbar onLogout={vi.fn()} onMenuClick={vi.fn()} /></MemoryRouter>);
    expect(screen.getAllByText("Administrator").length).toBeGreaterThan(0);
  });

  it("builds dashboard greetings from configured branding with safe fallbacks", () => {
    expect(buildDashboardGreeting({ name: "Jordan" }, { organizationShortName: "CPA", organizationName: "Configured Public Agency" }))
      .toBe("Welcome back, Jordan (CPA)");
    expect(buildDashboardGreeting({ name: "Jordan" }, { organizationName: "Configured Public Agency" }))
      .toBe("Welcome back, Jordan (Configured Public Agency)");
    expect(buildDashboardGreeting(null, {})).toBe("Welcome back, Administrator");
  });
});
