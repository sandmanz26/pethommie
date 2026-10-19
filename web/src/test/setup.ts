import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// jsdom has no <dialog> behaviour yet: model just enough of it (open / close) for the dialogs to be tested.
if (typeof HTMLDialogElement !== "undefined") {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
}

// A few files opt into the plain Node environment (`@vitest-environment node`); there is no DOM to reset.
afterEach(() => {
  if (typeof document === "undefined") return;
  cleanup();
  localStorage.clear();
  document.head.querySelectorAll("meta[name]").forEach((m) => m.remove());
  document.title = "";
});
