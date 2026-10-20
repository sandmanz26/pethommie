import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/shared/i18n/LocaleProvider";
import { LegalPage } from "./LegalPage";

function renderLegal(kind: "privacy" | "terms", locale?: "id") {
  if (locale) localStorage.setItem("pethommie.locale", locale);
  return render(
    <LocaleProvider>
      <MemoryRouter>
        <LegalPage kind={kind} />
      </MemoryRouter>
    </LocaleProvider>,
  );
}

afterEach(() => vi.unstubAllEnvs());

describe("legal pages", () => {
  it("has the privacy policy with a date and every section, and no unfilled placeholder", () => {
    renderLegal("privacy");
    expect(screen.getByRole("heading", { name: "Privacy policy", level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/last updated 20 october 2026/i)).toBeInTheDocument();
    const main = within(screen.getByRole("main"));
    expect(main.getAllByRole("heading", { level: 2 }).length).toBeGreaterThanOrEqual(6);
    expect(main.getByText(/stored in your own browser/i)).toBeInTheDocument();
    expect(screen.getByRole("main").textContent).not.toMatch(/\{company\}|\{contact\}/);
  });

  it("says plainly that nothing is sent to us yet, because that is true of the product today", () => {
    renderLegal("privacy");
    expect(screen.getByText(/not sent to us or to anyone else/i)).toBeInTheDocument();
    expect(screen.getByText(/do not run advertising or analytics trackers/i)).toBeInTheDocument();
  });

  it("has the terms, and says Pethommie never handles money", () => {
    renderLegal("terms");
    expect(screen.getByRole("heading", { name: "Terms of use", level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/does not take, hold or move money/i)).toBeInTheDocument();
  });

  it("is in Indonesian when the site is", () => {
    renderLegal("privacy", "id");
    expect(screen.getByRole("heading", { name: "Kebijakan privasi", level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/UU No\. 27 Tahun 2022/)).toBeInTheDocument();
  });

  it("links the top bar back to the landing page's sections, and the footer to the other legal page", () => {
    renderLegal("privacy");
    const nav = within(screen.getByRole("banner"));
    expect(nav.getByRole("link", { name: "Features" })).toHaveAttribute("href", "/#features");
    expect(nav.getByRole("link", { name: "Pethommie" })).toHaveAttribute("href", "/");
    expect(within(screen.getByRole("contentinfo")).getByRole("link", { name: "Terms of use" })).toHaveAttribute("href", "/terms");
  });
});
