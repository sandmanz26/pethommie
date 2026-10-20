import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Avatar } from "./Avatar";

describe("Avatar", () => {
  it("shows a face for dogs and cats", () => {
    const { container } = render(<Avatar name="Mochi" species="cat" />);
    expect(container.querySelector("img")).toHaveAttribute("src", "/icons/ui/cat.webp");
    expect(screen.queryByText("M")).not.toBeInTheDocument();
  });

  it("falls back to the initial for other animals", () => {
    const { container } = render(<Avatar name="bunny" species="rabbit" />);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("B")).toBeInTheDocument();
  });
});
