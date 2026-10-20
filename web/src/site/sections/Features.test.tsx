import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "@/shared/i18n/LocaleProvider";
import { Features } from "./Features";

describe("Features", () => {
  it("says plainly which promise is not built yet", () => {
    render(
      <LocaleProvider>
        <Features />
      </LocaleProvider>,
    );
    const soon = screen.getAllByText("Soon");
    expect(soon).toHaveLength(1);
    expect(within(soon[0].closest(".feature") as HTMLElement).getByRole("heading")).toHaveTextContent("Booking link with deposit");
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
