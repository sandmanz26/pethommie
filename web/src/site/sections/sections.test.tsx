import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "@/shared/i18n/LocaleProvider";
import { Faq } from "./Faq";
import { HowItWorks } from "./HowItWorks";
import { Modes } from "./Modes";
import { ProductTour } from "./ProductTour";
import { Trust } from "./Trust";

const wrap = (node: React.ReactNode) => render(<LocaleProvider>{node}</LocaleProvider>);

describe("landing sections", () => {
  it("answers the questions people ask first, one open at a time by choice", async () => {
    wrap(<Faq />);
    const faq = within(screen.getByRole("heading", { name: /what people ask first/i }).closest("section")!);
    expect(faq.getAllByText(/\?$/)).toHaveLength(8);
    const q = faq.getByText("How much does it cost?");
    await userEvent.click(q);
    expect(q.closest("details")).toHaveAttribute("open");
    expect(faq.getByText(/free for 30 days/i)).toBeVisible();
  });

  it("shows real screens, in the visitor's language, each with a description and a size", () => {
    wrap(<ProductTour />);
    const imgs = screen.getAllByRole("img");
    expect(imgs.map((i) => i.getAttribute("src"))).toEqual(["/screens/today-en.jpg", "/screens/booking-en.jpg", "/screens/calendar-en.jpg"]);
    for (const i of imgs) {
      expect(i.getAttribute("alt")).toMatch(/^Pethommie screen: /);
      expect(i).toHaveAttribute("width");
      expect(i).toHaveAttribute("height");
    }
    expect(screen.getByRole("link", { name: "Open the demo" })).toHaveAttribute("href", "/app/login");
  });

  it("explains the two modes, and that switching loses nothing", () => {
    wrap(<Modes />);
    expect(screen.getByRole("heading", { name: "Simple" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Advanced" })).toBeInTheDocument();
    expect(screen.getByText(/never your data/i)).toBeInTheDocument();
  });

  it("is honest about what it is: early, local, no money handling", () => {
    wrap(<Trust />);
    expect(screen.getByRole("heading", { name: "Still early" })).toBeInTheDocument();
    expect(screen.getByText(/doesn't process payments/i)).toBeInTheDocument();
    expect(screen.getByText(/stored on your own device/i)).toBeInTheDocument();
  });

  it("has three steps in order", () => {
    wrap(<HowItWorks />);
    expect(screen.getAllByRole("listitem").map((li) => li.querySelector("h3")?.textContent)).toEqual(["Add your cages", "Run the day", "Send the report"]);
  });
});
