import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "@/shared/i18n/LocaleProvider";
import { Faq } from "./Faq";
import { FinalCta } from "./FinalCta";
import { Pricing } from "./Pricing";
import { ProductTour } from "./ProductTour";
import { Kinds } from "./Kinds";
import { Compare } from "./Compare";
import { Insights } from "./Insights";
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

  it("shows real screens, one at a time behind tabs, on a laptop and a phone, in the visitor's language", async () => {
    wrap(<ProductTour />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual(["Today", "One stay", "Calendar"]);
    expect(screen.getAllByRole("tabpanel")).toHaveLength(1);
    expect(screen.getByRole("img", { name: "Pethommie screen: Today" })).toHaveAttribute("src", "/screens/today-en.jpg");
    expect(screen.getByRole("img", { name: "Pethommie on a phone: Today" })).toHaveAttribute("src", "/screens/today-phone-en.webp");
    expect(screen.getByText(/who arrives, who leaves/i)).toBeInTheDocument();

    await userEvent.click(tabs[2]);
    expect(tabs[2]).toHaveAttribute("aria-selected", "true");
    const img = screen.getByRole("img", { name: "Pethommie screen: Calendar" });
    expect(img).toHaveAttribute("src", "/screens/calendar-en.jpg");
    expect(img).toHaveAttribute("width");
    expect(img).toHaveAttribute("height");
    expect(screen.getByText(/tap a free day to book/i)).toBeInTheDocument();

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

  it("speaks to every kind of pet hotel, each with its picture", () => {
    wrap(<Kinds />);
    const items = screen.getAllByRole("listitem");
    expect(items.map((li) => within(li).getByRole("heading").textContent)).toEqual(["Pet hotel with cages", "Cage-free & daycare", "Home boarding", "Cattery & small pets"]);
    expect(items[1].querySelector("img")).toHaveAttribute("src", "/illustrations/kind-rooms.webp");
  });

  it("sets the day before and after side by side, as a table", () => {
    wrap(<Compare />);
    const table = screen.getByRole("table", { name: /from notebook and chats/i });
    const rows = within(table).getAllByRole("row");
    expect(rows).toHaveLength(6);
    expect(within(rows[2]).getByRole("rowheader")).toHaveTextContent("Who still owes us?");
    expect(within(rows[2]).getAllByRole("cell")[1]).toHaveTextContent(/reminder ready to send/);
  });

  it("shows the real dashboard in the visitor's language, and says the booking link takes no payment", () => {
    wrap(
      <>
        <Insights />
        <LinkSpot />
      </>,
    );
    expect(screen.getByRole("img", { name: /the pethommie dashboard/i })).toHaveAttribute("src", "/screens/wide-dashboard-en.webp");
    expect(screen.getByText(/no payment on the page yet/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Make my link" })).toHaveAttribute("href", "/app/register");
  });
});
