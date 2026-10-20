import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { Select } from "./Select";

function Fruit({ inLabel = false }: { inLabel?: boolean }) {
  const [v, setV] = useState("apple");
  const select = (
    <Select id="fruit" value={v} onChange={(e) => setV(e.target.value)}>
      <option value="apple">Apple</option>
      <>
        <option value="banana">Banana</option>
        <option value="blueberry" disabled>
          Blueberry
        </option>
      </>
      <option value="cherry">Cherry</option>
    </Select>
  );
  return (
    <>
      {inLabel ? (
        <label>
          Fruit {select}
        </label>
      ) : (
        <>
          <label htmlFor="fruit">Fruit</label>
          {select}
        </>
      )}
      <output>{v}</output>
    </>
  );
}

describe("Select", () => {
  it("is named by its label, shows the chosen option, and opens a list of the options", async () => {
    const user = userEvent.setup();
    render(<Fruit />);
    const box = screen.getByRole("combobox", { name: "Fruit" });
    expect(box).toHaveTextContent("Apple");
    expect(box).toHaveAttribute("aria-expanded", "false");
    await user.click(box);
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["Apple", "Banana", "Blueberry", "Cherry"]);
    expect(screen.getByRole("option", { name: "Apple" })).toHaveAttribute("aria-selected", "true");
    await user.click(screen.getByRole("option", { name: "Cherry" }));
    expect(screen.getByRole("status")).toHaveTextContent("cherry");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(box).toHaveFocus();
  });

  it("works from the keyboard, skipping disabled options", async () => {
    const user = userEvent.setup();
    render(<Fruit />);
    screen.getByRole("combobox").focus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    expect(screen.getByRole("status")).toHaveTextContent("cherry");
    await user.keyboard("{ArrowDown}{Home}{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("cherry");
  });

  it("jumps to an option by typing its first letters", async () => {
    const user = userEvent.setup();
    render(<Fruit />);
    screen.getByRole("combobox").focus();
    await user.keyboard("b");
    expect(screen.getByRole("status")).toHaveTextContent("banana");
  });

  it("closes when the page is clicked elsewhere, and works inside a label", async () => {
    const user = userEvent.setup();
    render(<Fruit inLabel />);
    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "Banana" }));
    expect(screen.getByRole("status")).toHaveTextContent("banana");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    await user.click(screen.getByRole("combobox"));
    await user.click(document.body);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
