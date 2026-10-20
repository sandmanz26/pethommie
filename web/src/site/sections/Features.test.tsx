import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "@/shared/i18n/LocaleProvider";
import { Features } from "./Features";

describe("Features", () => {
  it("promises only what is built: nothing is marked as coming", () => {
    render(
      <LocaleProvider>
        <Features />
      </LocaleProvider>,
    );
    expect(screen.queryByText("Soon")).not.toBeInTheDocument();
    expect(within(screen.getByRole("heading", { name: "Booking link" }).closest(".feature") as HTMLElement).getByText(/Book a stay at/)).toBeInTheDocument();
  });

  it("shows the real screen of every feature that exists, in the visitor's language, and none for the one that doesn't", () => {
    render(
      <LocaleProvider>
        <Features />
      </LocaleProvider>,
    );
    const shots = screen.getAllByRole("img", { name: /^Pethommie screen: / });
    expect(shots).toHaveLength(6);
    for (const s of shots) expect(s.getAttribute("src")).toMatch(/^\/screens\/feature-[a-z]+-en\.webp$/);
    expect(screen.queryByRole("img", { name: "Pethommie screen: Booking link with deposit" })).not.toBeInTheDocument();
  });
});
