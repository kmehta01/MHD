import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Install from "./Install";

const jsonResponse = (payload) => ({ ok: true, json: vi.fn().mockResolvedValue(payload) });

describe("installer branding", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("fetch", vi.fn().mockImplementation((url) => {
      if (url.endsWith("/install/status")) {
        return Promise.resolve(jsonResponse({ installed: false, message: "Ready" }));
      }
      return Promise.reject(new Error("not installed"));
    }));
  });

  it("uses a neutral identity before settings are available", async () => {
    render(<Install />);

    expect(screen.getAllByText("Application Installer").length).toBeGreaterThan(0);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText("Ready")).toHaveLength(2));
  });

  it("loads branding from the backend URL and ignores a stale response after the URL changes", async () => {
    let resolveOriginalBranding;
    const originalBranding = new Promise((resolve) => { resolveOriginalBranding = resolve; });
    fetch.mockImplementation((url) => {
      if (url.endsWith("/install/status")) return Promise.resolve(jsonResponse({ installed: true }));
      if (url.startsWith("http://localhost:5001/")) return originalBranding;
      if (url.startsWith("http://new-backend.test/")) {
        return Promise.resolve(jsonResponse({ data: {
          organization: { organizationName: "New Agency", portalName: "New Portal", logo: "/new-logo.png" },
          portal: {}, footer: {},
        } }));
      }
      return Promise.reject(new Error("unexpected URL"));
    });
    render(<Install />);

    fireEvent.change(screen.getByLabelText("Backend URL"), { target: { value: "http://new-backend.test" } });
    expect(await screen.findByRole("heading", { name: "New Portal" })).toBeInTheDocument();
    expect(screen.getByAltText("New Agency")).toHaveAttribute("src", "http://new-backend.test/new-logo.png");

    resolveOriginalBranding(jsonResponse({ data: {
      organization: { organizationName: "Stale Agency", portalName: "Stale Portal", logo: "/stale.png" },
      portal: {}, footer: {},
    } }));
    await waitFor(() => expect(screen.queryByText("Stale Portal")).not.toBeInTheDocument());
  });
});
