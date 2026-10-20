// @vitest-environment node
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CARE_KINDS } from "@/app/domain/careLog";
import { CARE_ICON, UI_ICONS } from "./uiIcons";

const dir = fileURLToPath(new URL("../../../../public/icons/ui", import.meta.url));

describe("UiIcon files", () => {
  const files = readdirSync(dir).map((f) => f.replace(/\.webp$/, ""));

  it("has a file for every icon the app asks for, so none shows as a broken image", () => {
    expect(files).toEqual(expect.arrayContaining([...UI_ICONS]));
  });

  it("has no file the app doesn't use, so nothing is shipped and cached for nothing", () => {
    expect(files.filter((f) => !(UI_ICONS as readonly string[]).includes(f))).toEqual([]);
  });

  it("has an icon for every kind of care entry", () => {
    expect(Object.keys(CARE_ICON).sort()).toEqual([...CARE_KINDS].sort());
  });
});
