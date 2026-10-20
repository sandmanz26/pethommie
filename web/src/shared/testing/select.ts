import type { UserEvent } from "@testing-library/user-event";

/** The options of one of our dropdowns, opening it if needed. */
export async function openOptions(user: UserEvent, control: HTMLElement): Promise<HTMLElement[]> {
  if (control.getAttribute("aria-expanded") !== "true") await user.click(control);
  const list = document.getElementById(control.getAttribute("aria-controls") ?? "");
  if (!list) throw new Error("the dropdown did not open");
  return [...list.querySelectorAll<HTMLElement>('[role="option"]')];
}

/** Picks the option with this value in one of our dropdowns, the way a person does: open it, click the option. */
export async function choose(user: UserEvent, control: HTMLElement, value: string) {
  const option = (await openOptions(user, control)).find((o) => o.dataset.value === value);
  if (!option) throw new Error(`no option "${value}"`);
  await user.click(option);
}
