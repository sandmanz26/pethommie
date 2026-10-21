import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "@/shared/i18n/LocaleProvider";
import { Features } from "./Features";

const wrap = () =>
  render(
    <LocaleProvider>
      <Features />
    </LocaleProvider>,
  );

describe("Features", () => {
  it("promises only what is built: nothing is marked as coming", () => {
    wrap();
    expect(screen.queryByText("Soon")).not.toBeInTheDocument();
  });

  it("shows each feature as a picture in the film's style and one line, never a screenshot", () => {
    wrap();
    const cards = within(screen.getByRole("list", { name: "Everything a pet hotel runs on." })).getAllByRole("listitem");
    expect(cards).toHaveLength(8);
    for (const card of cards) {
      const pictures = card.querySelectorAll("img");
      expect(pictures).toHaveLength(1);
      expect(pictures[0].getAttribute("src")).toMatch(/^\/illustrations\/feature-[a-z-]+\.webp$/);
    }
    expect(screen.queryByRole("img", { name: /screen/i })).not.toBeInTheDocument();
  });
});
