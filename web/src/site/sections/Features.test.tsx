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
    const soon = screen.getAllByText("Coming soon");
    expect(soon).toHaveLength(1);
    expect(within(soon[0].closest(".feature") as HTMLElement).getByRole("heading")).toHaveTextContent("Booking link with QRIS deposit");
  });
});
