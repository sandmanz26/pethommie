// @vitest-environment node
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("product tour screens", () => {
  it("exist for every screen and language, so no image on the landing page is broken", () => {
    for (const screen of ["today", "booking", "calendar"]) {
      for (const locale of ["en", "id"]) {
        const file = fileURLToPath(new URL(`../../../public/screens/${screen}-${locale}.jpg`, import.meta.url));
        expect(existsSync(file), file).toBe(true);
      }
    }
  });
});
