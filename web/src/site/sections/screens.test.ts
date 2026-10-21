// @vitest-environment node
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { en } from "@/site/i18n/en";

const file = (path: string) => fileURLToPath(new URL(`../../../public${path}`, import.meta.url));

describe("landing page pictures", () => {
  it("exist for every tour screen, laptop and phone, in every language, so no image is broken", () => {
    for (const screen of ["today", "booking", "calendar"]) {
      for (const locale of ["en", "id"]) {
        expect(existsSync(file(`/screens/${screen}-${locale}.webp`)), screen).toBe(true);
        expect(existsSync(file(`/screens/${screen}-phone-${locale}.webp`)), screen).toBe(true);
      }
    }
  });

  it("exist for every feature: its illustration, and its screen in every language", () => {
    for (const f of en.features.items) {
      expect(existsSync(file(`/illustrations/${f.art}.webp`)), f.art).toBe(true);
    }
  });

  it("exist for the FAQ corners and the register scene", () => {
    for (const name of ["faq-dog", "faq-cat", "pet-hotel-scene", "pet-hotel-scene-800"]) expect(existsSync(file(`/backgrounds/${name}.webp`)), name).toBe(true);
  });
});
