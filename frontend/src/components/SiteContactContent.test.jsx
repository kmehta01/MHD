import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Footer from "./Footer";
import Header from "./Header";

const t = (key) => key;

describe("settings-driven site contacts", () => {
  it("uses the configured header phone label and active social links", () => {
    const view = render(<MemoryRouter><Header
      branding={{ organizationShortName: "MHD", officialPhone: "(501) 800-1000", officialPhoneLabel: "Public support line" }}
      language="English" onLanguageChange={vi.fn()}
      settings={{ grievanceSubmission: { allowPublicSubmission: false } }}
      socialLinks={[{ platformKey: "instagram", iconKey: "instagram", label: "Our Instagram", url: "https://instagram.com/example" }]}
      t={t}
    /></MemoryRouter>);
    expect(screen.getByText("Public support line")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Our Instagram" })).toHaveAttribute("href", "https://instagram.com/example");
    expect(view.container.querySelectorAll(".header-topbar__social a")).toHaveLength(1);
  });

  it("prefers footer support contacts and falls back to organization contacts", () => {
    const base = {
      organization: { organizationName: "Ministry", organizationShortName: "MHD", officialPhone: "+5011111111", officialEmail: "official@example.test" },
      footer: { footerText: "Ministry portal", copyrightYear: 2030, supportPhone: "+5012222222", supportEmail: "support@example.test" },
    };
    const view = render(<MemoryRouter><Footer settings={base} t={t} /></MemoryRouter>);
    expect(screen.getByRole("link", { name: "+5012222222" })).toHaveAttribute("href", "tel:+5012222222");
    expect(screen.getByRole("link", { name: "support@example.test" })).toHaveAttribute("href", "mailto:support@example.test");
    expect(screen.getByText(/© 2030 Ministry portal/)).toBeInTheDocument();

    view.rerender(<MemoryRouter><Footer settings={{ ...base, footer: { ...base.footer, supportPhone: "", supportEmail: "" } }} t={t} /></MemoryRouter>);
    expect(screen.getByRole("link", { name: "+5011111111" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "official@example.test" })).toBeInTheDocument();
  });
});
