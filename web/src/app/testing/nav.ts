import { fireEvent } from "@testing-library/react";

/** Unfolds every group in the sidebar, so a test can reach any page's link the way a person would. */
export function openNavGroups() {
  for (const toggle of document.querySelectorAll<HTMLButtonElement>('.ds-sidenav__toggle[aria-expanded="false"]')) fireEvent.click(toggle);
}
