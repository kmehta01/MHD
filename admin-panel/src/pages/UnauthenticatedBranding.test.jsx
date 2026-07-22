import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Login from "./Login";
import RecoveryCodes from "./RecoveryCodes";

const publicSettings = {
  organization: {
    organizationName: "Configured Public Agency",
    portalName: "Configured Portal",
    logo: "/uploads/settings/configured-logo.png",
    favicon: "/uploads/settings/configured-icon.png",
  },
  portal: { portalSubtitle: "Configured service administration" },
  footer: { footerText: "Configured public service", copyrightYear: 2031 },
};

const response = (data) => ({
  ok: true,
  json: vi.fn().mockResolvedValue({ data }),
});

describe("unauthenticated admin branding", () => {
  beforeEach(() => {
    localStorage.clear();
    document.querySelector("link[data-dynamic-branding='favicon']")?.remove();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(publicSettings)));
  });

  it("renders current public branding throughout the login page", async () => {
    render(<MemoryRouter><Login /></MemoryRouter>);

    expect(await screen.findByText("Configured Portal Administration")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Configured service administration" })).toBeInTheDocument();
    expect(screen.getByText("© 2031 Configured public service")).toBeInTheDocument();
    expect(screen.getAllByAltText("Configured Public Agency")).toHaveLength(2);
    expect(screen.getAllByAltText("Configured Public Agency")[0]).toHaveAttribute(
      "src",
      "http://localhost:5001/uploads/settings/configured-logo.png",
    );
    await waitFor(() => expect(document.title).toBe("Configured Portal | Administration Portal"));
    expect(document.querySelector("link[data-dynamic-branding='favicon']")).toHaveAttribute(
      "href",
      "http://localhost:5001/uploads/settings/configured-icon.png",
    );
  });

  it("shows cached branding immediately when the public endpoint is unavailable", () => {
    localStorage.setItem("admin_branding", JSON.stringify({
      organizationName: "Cached Agency",
      portalName: "Cached Portal",
      portalSubtitle: "Cached administration",
      logo: "/cached-logo.png",
      favicon: "",
      footerText: "Cached service",
      copyrightYear: 2030,
    }));
    fetch.mockRejectedValueOnce(new Error("offline"));

    render(<MemoryRouter><Login /></MemoryRouter>);

    expect(screen.getByText("Cached Portal Administration")).toBeInTheDocument();
    expect(screen.getByText("© 2030 Cached service")).toBeInTheDocument();
  });

  it("omits optional copyright and uses clean fallbacks for empty public values", async () => {
    fetch.mockResolvedValueOnce(response({
      organization: { organizationName: "Agency", portalName: "Agency Portal", logo: "" },
      portal: { portalSubtitle: "" },
      footer: { footerText: "", copyrightYear: null },
    }));

    render(<MemoryRouter><Login /></MemoryRouter>);

    expect(await screen.findByText("Agency Portal Administration")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Administration Portal" })).toBeInTheDocument();
    expect(screen.queryByText(/^©/)).not.toBeInTheDocument();
    expect(screen.getAllByRole("img").every((image) => Boolean(image.getAttribute("src")))).toBe(true);
  });

  it("brands the recovery-code page without changing its security workflow", async () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: "/recovery-codes", state: { recoveryCodes: ["AAAA-BBBB-CCCC"] } }]}>
        <RecoveryCodes />
      </MemoryRouter>,
    );

    expect(await screen.findByAltText("Configured Public Agency")).toHaveAttribute(
      "src",
      "http://localhost:5001/uploads/settings/configured-logo.png",
    );
    expect(screen.getByText("AAAA-BBBB-CCCC")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Continue to dashboard/ })).toBeDisabled();
  });
});
