import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "@/shared/i18n/LocaleProvider";
import { Cost } from "./Cost";

const wrap = () => render(<LocaleProvider>{<Cost />}</LocaleProvider>);

describe("what running without Pethommie costs", () => {
  it("names four leaks, each with its amount and the assumption behind it", () => {
    wrap();
    const leaks = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(leaks.map((l) => within(l).getByRole("heading").textContent)).toEqual([
      "Empty nights you didn't see",
      "Balances nobody chased",
      "Extras that never made the bill",
      "Evenings spent typing",
    ]);
    expect(leaks[0]).toHaveTextContent(/− Rp 900\.000.*1 lost night per cage, per month/);
    expect(leaks[1]).toHaveTextContent(/− Rp 486\.000.*3% of what you bill/);
    expect(leaks[2]).toHaveTextContent(/− Rp 324\.000.*2% of what you bill/);
    expect(leaks[3]).toHaveTextContent(/30 hours a month.*1 hour a day/);
  });

  it("adds the leaks up to a monthly and a yearly sum, for a small hotel to start", () => {
    wrap();
    // every leak counts once it has scrolled past the reading line (in this test window, all of them have)
    const meter = within(screen.getByText("Leaking every month", { selector: ".cost__label" }).parentElement!);
    expect(meter.getByText("Rp 1.710.000")).toBeInTheDocument();
    expect(meter.getByText("About Rp 20.520.000 a year")).toBeInTheDocument();
  });

  it("recounts for the visitor's own hotel, and says it is an example, not a promise", () => {
    wrap();
    fireEvent.change(screen.getByRole("slider", { name: /cages or places/i }), { target: { value: "24" } });
    // 24 cages: Rp 32.400.000 billed; leaks 1.800.000 + 972.000 + 648.000
    expect(screen.getByText("You bill about Rp 32.400.000 a month")).toBeInTheDocument();
    expect(screen.getByText(/Leaking every month: Rp 3\.420\.000/)).toBeInTheDocument();
    expect(screen.getByText(/not a promise/i)).toBeInTheDocument();
  });

  it("asks for the free trial, never a demo", () => {
    wrap();
    expect(screen.getByRole("link", { name: /free for 30 days/i })).toHaveAttribute("href", "/app/register");
    expect(screen.queryByRole("link", { name: /demo/i })).not.toBeInTheDocument();
  });
});
