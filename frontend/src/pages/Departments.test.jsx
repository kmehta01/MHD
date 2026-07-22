import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import Departments from "./Departments";

const renderDirectory = (siteDirectory) => render(
  <MemoryRouter initialEntries={["/departments"]}>
    <Routes>
      <Route element={<Outlet context={{ siteDirectory }} />}>
        <Route path="/departments" element={<Departments />} />
      </Route>
    </Routes>
  </MemoryRouter>,
);

describe("public department directory", () => {
  it("renders renamed and reordered directory records from the API context", () => {
    renderDirectory({
      facilities: [{ id: 1, key: "help_centre", name: "Renamed Help Centre", address: "Dynamic address", description: "Dynamic description", imagePath: "", contacts: [{ id: 3, type: "phone", label: "Hotline", displayValue: "Display phone", linkValue: "+5018001000" }] }],
      departments: [{ id: 2, code: "DYNAMIC", name: "Renamed Department", address: "Department address", iconKey: "building", contacts: [{ id: 4, type: "email", label: "Public email", displayValue: "display@example.test", linkValue: "display@example.test" }] }],
    });
    expect(screen.getByText("Renamed Help Centre")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Display phone" })).toHaveAttribute("href", "tel:+5018001000");
    expect(screen.getByText("Renamed Department")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "display@example.test" })).toHaveAttribute("href", "mailto:display@example.test");
  });

  it("does not invent fallback directory records when the API returns none", () => {
    const view = renderDirectory({ facilities: [], departments: [] });
    expect(view.container.querySelector(".facility-grid")?.children).toHaveLength(0);
    expect(view.container.querySelector(".department-contact-grid")?.children).toHaveLength(0);
  });
});
