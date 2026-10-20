// @vitest-environment node
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ILLUSTRATIONS, NAV_ART } from "./art";

const file = (path: string) => fileURLToPath(new URL(`../../../../public${path}`, import.meta.url));

describe("app art", () => {
  it("has a file for every navigation icon and illustration, so none shows as a broken image", () => {
    for (const name of NAV_ART) expect(existsSync(file(`/icons/nav/${name}.webp`)), name).toBe(true);
    for (const name of ILLUSTRATIONS) expect(existsSync(file(`/illustrations/${name}.webp`)), name).toBe(true);
  });
});
