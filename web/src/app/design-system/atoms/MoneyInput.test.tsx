import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { MoneyInput } from "./MoneyInput";
import { groupDigits } from "./money";

function Harness({ start = "" }: { start?: string }) {
  const [v, setV] = useState(start);
  return (
    <>
      <label>
        Amount <MoneyInput value={v} onChange={(e) => setV(e.target.value)} />
      </label>
      <output>{v}</output>
    </>
  );
}

describe("money input", () => {
  it("groups thousands with dots, and keeps only digits", () => {
    expect(groupDigits("1500000")).toBe("1.500.000");
    expect(groupDigits("Rp 75.000")).toBe("75.000");
    expect(groupDigits("007")).toBe("7");
    expect(groupDigits("abc")).toBe("");
    expect(groupDigits("999")).toBe("999");
  });

  it("separates thousands while you type, and hands the grouped text on", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const box = screen.getByLabelText("Amount");
    await user.type(box, "1250000");
    expect(box).toHaveValue("1.250.000");
    expect(screen.getByRole("status")).toHaveTextContent("1.250.000");
    await user.type(box, "x");
    expect(box).toHaveValue("1.250.000");
  });

  it("keeps the cursor after the digit typed in the middle", async () => {
    const user = userEvent.setup();
    render(<Harness start="100000" />);
    const box = screen.getByLabelText("Amount") as HTMLInputElement;
    expect(box).toHaveValue("100.000");
    box.setSelectionRange(1, 1); // after the "1"
    await user.type(box, "5", { initialSelectionStart: 1, initialSelectionEnd: 1 });
    expect(box).toHaveValue("1.500.000");
    expect(box.selectionStart).toBe(3); // after "1.5"
  });
});
