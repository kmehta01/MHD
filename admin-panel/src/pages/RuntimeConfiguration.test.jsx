import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import API from "../services/api";
import RuntimeConfiguration from "./RuntimeConfiguration";

vi.mock("../services/api", () => ({ default: { get: vi.fn(), put: vi.fn(), post: vi.fn(), delete: vi.fn() } }));

const configuration = {
  categories: [], locations: [], departments: [{ id: 1, code: "MHQ", name: "Operational name", is_active: 1 }],
  categoryMappings: [], formOptions: {}, holidays: [], routingRules: [], officers: [],
  workflow: { statuses: [], priorities: [], transitions: [] },
};
const siteDirectory = {
  departments: [{ id: 1, code: "MHQ", name: "Public name", operationalName: "Operational name", address: "Old address", summary: "", iconKey: "building", sortOrder: 10, isVisible: true, contacts: [] }],
  facilities: [], socialLinks: [],
  capabilities: { directoryIcons: [{ key: "building", iconName: "building" }], socialPlatforms: [{ key: "facebook", label: "Facebook", iconKey: "facebook_f" }] },
};

const NavigationHarness = () => {
  const navigate = useNavigate();
  return <><button onClick={() => navigate("/department-management/facilities")} type="button">Open facilities</button><RuntimeConfiguration /></>;
};

describe("RuntimeConfiguration public directory", () => {
  beforeEach(() => {
    API.get.mockReset(); API.put.mockReset(); API.post.mockReset();
    API.get.mockImplementation((url) => Promise.resolve({ data: { data: url.endsWith("site-directory") ? siteDirectory : configuration } }));
    API.put.mockResolvedValue({ data: { status: true } });
  });

  it("edits a department public profile independently from its operational master record", async () => {
    render(<MemoryRouter initialEntries={["/department-management/public-directory"]}><Routes><Route path="/department-management/:module" element={<RuntimeConfiguration />} /></Routes></MemoryRouter>);
    await screen.findByText("Public department profiles");
    fireEvent.click(screen.getByRole("button", { name: "Edit profile" }));
    const name = screen.getByPlaceholderText("Public department name");
    fireEvent.change(name, { target: { value: "Renamed public office" } });
    fireEvent.click(screen.getByRole("button", { name: "Save public profile" }));
    await waitFor(() => expect(API.put).toHaveBeenCalledWith(
      "/configuration/site-directory/departments/1",
      expect.objectContaining({ id: 1, name: "Renamed public office", isVisible: true }),
    ));
  });

  it("keeps a loading state while directory data is pending after an in-app mode change", async () => {
    API.get.mockImplementation((url) => {
      if (url.endsWith("site-directory")) return new Promise(() => {});
      return Promise.resolve({ data: { data: configuration } });
    });

    render(<MemoryRouter initialEntries={["/department-management/departments"]}><Routes><Route path="/department-management/:module" element={<NavigationHarness />} /></Routes></MemoryRouter>);
    await screen.findByText("Configured items");
    fireEvent.click(screen.getByRole("button", { name: "Open facilities" }));

    expect(await screen.findByText(/Loading runtime configuration/)).toBeInTheDocument();
  });
});
