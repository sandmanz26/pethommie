import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { copyrightYears, company } from "@/shared/company";
import { LocaleProvider } from "@/shared/i18n/LocaleProvider";
import { Footer } from "./Footer";

describe("copyrightYears", () => {
  it("shows the first year alone, then a range", () => {
    expect(copyrightYears(new Date(company.sinceYear, 5, 1))).toBe("2026");
    expect(copyrightYears(new Date(2029, 0, 1))).toBe("2026–2029");
  });
});

describe("Footer", () => {
  const renderFooter = () =>
    render(
      <LocaleProvider>
        <MemoryRouter>
          <Footer />
        </MemoryRouter>
      </LocaleProvider>,
    );

  it("carries the copyright with the holder and the current year", () => {
    renderFooter();
    const foot = within(screen.getByRole("contentinfo"));
    expect(foot.getByText(new RegExp(`© ${copyrightYears().replace("–", ".")} ${company.name}\\. All rights reserved\\.`))).toBeInTheDocument();
  });

  it("links the legal pages and the demo, and the page sections from anywhere", () => {
    renderFooter();
    const foot = within(screen.getByRole("contentinfo"));
    expect(foot.getByRole("link", { name: "Privacy policy" })).toHaveAttribute("href", "/privacy");
    expect(foot.getByRole("link", { name: "Terms of use" })).toHaveAttribute("href", "/terms");
    expect(foot.getByRole("link", { name: "Open the demo" })).toHaveAttribute("href", "/app/demo");
    expect(foot.getByRole("link", { name: "FAQ" })).toHaveAttribute("href", "/#faq");
  });

  it("does not invent contact details: with none configured it points at the waitlist", () => {
    renderFooter();
    expect(company.email || company.whatsapp).toBeFalsy(); // the test environment sets none
    expect(screen.getByText(/join the waitlist and we'll be in touch/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^email$/i })).not.toBeInTheDocument();
  });
});
