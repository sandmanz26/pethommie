import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "@/shared/i18n/LocaleProvider";
import { Faq } from "./Faq";
import { FinalCta } from "./FinalCta";
import { Pricing } from "./Pricing";
import { tourSpots } from "@/site/content/tourSpots";
import { ProductTour } from "./ProductTour";
import { Kinds } from "./Kinds";
import { BeforeAfter } from "./BeforeAfter";
import { Problem } from "./Problem";
import { LinkSpot } from "./LinkSpot";

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

  it("shows real screens behind tabs, says what each does for the owner, and asks for the free trial beside it", async () => {
    wrap(<ProductTour />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual(["Today", "One stay", "Calendar"]);
    expect(screen.getAllByRole("tabpanel")).toHaveLength(1);
    expect(screen.getByRole("img", { name: "Pethommie screen: Today" })).toHaveAttribute("src", "/screens/today-en.webp");
    expect(screen.getByRole("img", { name: "Pethommie on a phone: Today" })).toHaveAttribute("src", "/screens/today-phone-en.webp");
    // a benefit, three numbered points, and the ask beside them
    expect(screen.getByRole("heading", { name: /your day, before the first owner/i })).toBeInTheDocument();
    expect(within(screen.getByRole("list", { name: /what this screen does/i })).getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByRole("link", { name: "Try free for 30 days" })).toHaveAttribute("href", "/app/register");
    expect(screen.getByRole("link", { name: /see the prices/i })).toHaveAttribute("href", "#pricing");
    expect(screen.queryByRole("link", { name: /demo/i })).not.toBeInTheDocument();

    await userEvent.click(tabs[2]);
    expect(tabs[2]).toHaveAttribute("aria-selected", "true");
    const img = screen.getByRole("img", { name: "Pethommie screen: Calendar" });
    expect(img).toHaveAttribute("src", "/screens/calendar-en.webp");
    expect(img).toHaveAttribute("width");
    expect(img).toHaveAttribute("height");
    expect(screen.getByText(/tap an empty day to book it/i)).toBeInTheDocument();

    // arrow keys move between tabs
    tabs[2].focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(tabs[0]).toHaveFocus();
  });

  it("marks each point on the screen with its number, for every screen and language", () => {
    for (const locale of ["en", "id"] as const)
      for (const key of ["today", "booking", "calendar"]) {
        const spots = tourSpots[locale][key];
        expect(spots, `${locale} ${key}`).toHaveLength(3);
        for (const s of spots) {
          expect(s, `${locale} ${key}`).not.toBeNull();
          expect(s!.x).toBeGreaterThan(0);
          expect(s!.x).toBeLessThan(100);
          expect(s!.y).toBeGreaterThan(0);
          expect(s!.y).toBeLessThan(100);
        }
      }
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
    // Each missing field says so under itself, and focus goes to the first one.
    const alerts = within(help).getAllByRole("alert").map((a) => a.textContent);
    expect(alerts).toEqual(["Please write your pet hotel's name.", "Please write your WhatsApp number.", "Please write your city."]);
    expect(within(help).getByLabelText(/name/i)).toHaveFocus();
    expect(within(help).getByLabelText(/name/i)).toHaveAttribute("aria-invalid", "true");

    await userEvent.type(within(help).getByLabelText(/name/i), "X");
    await userEvent.type(within(help).getByLabelText(/city/i), "Bandung");
    await userEvent.type(within(help).getByLabelText(/whatsapp/i), "12345");
    await userEvent.click(within(help).getByRole("button", { name: "Contact me on WhatsApp" }));
    expect(within(help).getAllByRole("alert").map((a) => a.textContent)).toEqual(["Use at least 2 characters.", expect.stringMatching(/doesn't look right/)]);
  });

  it("speaks to every kind of pet hotel, each with its picture", () => {
    wrap(<Kinds />);
    const items = screen.getAllByRole("listitem");
    expect(items.map((li) => within(li).getByRole("heading").textContent)).toEqual(["Pet hotel with cages", "Cage-free & daycare", "Home boarding", "Cattery & small pets"]);
    expect(items[1].querySelector("img")).toHaveAttribute("src", "/illustrations/kind-rooms.webp");
  });

  it("puts the cost of no system in three numbers, each with its assumption, and says it is an example", () => {
    wrap(<Problem />);
    expect(screen.getByRole("heading", { name: "A full hotel can still lose money." })).toBeInTheDocument();
    expect(screen.getByText(/12 places, Rp 75\.000 a night, 60% full/)).toBeInTheDocument();
    const facts = screen.getAllByRole("listitem");
    expect(facts).toHaveLength(3);
    // 12 lost nights at Rp 75.000; 5% of Rp 16.200.000 billed; 1 hour a day
    expect(facts[0]).toHaveTextContent(/Rp 900\.000 a month.*free places nobody saw.*1 night per place/);
    expect(facts[1]).toHaveTextContent(/Rp 810\.000 a month.*never collected.*5% of what you bill/);
    expect(facts[2]).toHaveTextContent(/30 hours a month.*chats.*1 hour a day/);
    expect(facts.map((f) => f.querySelector("img")?.getAttribute("src"))).toEqual(["/illustrations/problem-empty.webp", "/illustrations/problem-money.webp", "/illustrations/problem-time.webp"]);
    expect(screen.getByText("That's about Rp 1.710.000 a month, or Rp 20.520.000 a year.")).toBeInTheDocument();
    expect(screen.getByText(/an example, not a promise/i)).toBeInTheDocument();
  });

  it("shows the same desk before and after, in pictures, with what changes", () => {
    wrap(<BeforeAfter />);
    const before = screen.getByRole("article", { name: "Without Pethommie" });
    const after = screen.getByRole("article", { name: "With Pethommie" });
    expect(before.querySelector("img")).toHaveAttribute("src", "/illustrations/before.webp");
    expect(after.querySelector("img")).toHaveAttribute("src", "/illustrations/after.webp");
    expect(within(before).getAllByRole("listitem")).toHaveLength(4);
    expect(within(after).getAllByRole("listitem")[0]).toHaveTextContent("Free places show on the calendar");
  });

  it("says the booking link takes no payment", () => {
    wrap(<LinkSpot />);
    expect(screen.getByText(/no payment on the page yet/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Make my link" })).toHaveAttribute("href", "/app/register");
  });
});
