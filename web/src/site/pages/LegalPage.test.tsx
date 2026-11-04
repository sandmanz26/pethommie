import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/shared/i18n/LocaleProvider";
import { LegalPage } from "./LegalPage";

function renderLegal(kind: "privacy" | "terms", locale?: "id", server = false) {
  if (locale) localStorage.setItem("pethommie.locale", locale);
  return render(
    <LocaleProvider>
      <MemoryRouter>
        <LegalPage kind={kind} server={server} />
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

  it("once accounts live on a server, says what is collected, where it is kept, who sees it and for how long", () => {
    renderLegal("privacy", undefined, true);
    const text = screen.getByRole("main").textContent ?? "";
    expect(text).toMatch(/last updated 4 november 2026/i);
    expect(text).toMatch(/name, email address and profile picture from Google/);
    expect(text).toMatch(/Supabase, on servers in Singapore/);
    expect(text).toMatch(/Try now" stay in your browser only/);
    expect(text).toMatch(/Law No\. 27 of 2022/);
    expect(text).not.toMatch(/not sent to us or to anyone else/);
    expect(text).not.toMatch(/\{company\}|\{contact\}/);
  });

  it("in Indonesian too, for a server deployment", () => {
    renderLegal("privacy", "id", true);
    expect(screen.getByText(/disimpan di Supabase, di server Singapura/)).toBeInTheDocument();
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
