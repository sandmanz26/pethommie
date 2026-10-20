import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Avatar } from "./Avatar";

describe("Avatar", () => {
  it("shows the first letter of the name, whatever the species", () => {
    render(<Avatar name="mochi" species="cat" />);
    expect(screen.getByText("M")).toBeInTheDocument();
  });

  it("shows a question mark when the name is blank", () => {
    render(<Avatar name="  " species="dog" />);
    expect(screen.getByText("?")).toBeInTheDocument();
  });
});
