import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "@/shared/i18n/LocaleProvider";
import { Faq } from "./Faq";
import { FinalCta } from "./FinalCta";
import { Pricing } from "./Pricing";
import { ProductTour } from "./ProductTour";

const wrap = (node: React.ReactNode) => render(<LocaleProvider>{node}</LocaleProvider>);

describe("landing sections", () => {
  it("answers the questions people ask first, one open at a time by choice", async () => {
    wrap(<Faq />);
    const faq = within(screen.getByRole("heading", { name: /what people ask first/i }).closest("section")!);
    expect(faq.getAllByText(/\?$/)).toHaveLength(7);
    const q = faq.getByText("How much does it cost?");
    await userEvent.click(q);
    expect(q.closest("details")).toHaveAttribute("open");
    expect(faq.getByText(/free for 30 days/i)).toBeVisible();
  });

  it("shows real screens, one at a time behind tabs, in the visitor's language", async () => {
    wrap(<ProductTour />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((t) => t.querySelector("b")?.textContent)).toEqual(["Today", "One stay", "Calendar"]);
    expect(screen.getByRole("tabpanel").querySelector("img")).toHaveAttribute("src", "/screens/today-en.jpg");

    await userEvent.click(tabs[2]);
    expect(tabs[2]).toHaveAttribute("aria-selected", "true");
    const img = screen.getByRole("img", { name: "Pethommie screen: Calendar" });
    expect(img).toHaveAttribute("src", "/screens/calendar-en.jpg");
    expect(img).toHaveAttribute("width");
    expect(img).toHaveAttribute("height");
    expect(screen.getAllByRole("tabpanel")).toHaveLength(1);

    // arrow keys move between tabs
    tabs[2].focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(tabs[0]).toHaveFocus();
    expect(screen.getByRole("link", { name: "Open the demo" })).toHaveAttribute("href", "/app/login");
  });

  it("prices only what exists, and says plainly what is coming", () => {
    wrap(<Pricing />);
    const soon = screen.getByText("Coming soon");
    expect(soon.closest("article")).toHaveTextContent("Lebaran package");
    expect(screen.getAllByText("Coming soon")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Start free" })).toHaveAttribute("href", "/app/register");
  });

  it("ends with one ask to sign up, and a form for those who want help", async () => {
    wrap(<FinalCta />);
    expect(screen.getByRole("link", { name: "Try free for 30 days" })).toHaveAttribute("href", "/app/register");
    const help = screen.getByText("Rather we set it up with you?").closest("details")!;
    expect(help).not.toHaveAttribute("open");
    await userEvent.click(screen.getByText("Rather we set it up with you?"));
    expect(help).toHaveAttribute("open");
    await userEvent.click(within(help).getByRole("button", { name: "Contact me on WhatsApp" }));
    expect(within(help).getByRole("alert")).toHaveTextContent(/fill in your pet hotel name/i);
  });
});
