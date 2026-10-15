import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// A few files opt into the plain Node environment (`@vitest-environment node`); there is no DOM to reset.
afterEach(() => {
  if (typeof document === "undefined") return;
  cleanup();
  localStorage.clear();
  document.head.querySelectorAll("meta[name]").forEach((m) => m.remove());
  document.title = "";
});
