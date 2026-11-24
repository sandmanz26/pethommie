import { describe, expect, it } from "vitest";
import { moreItems, sideItems, sideNav } from "./navItems";

describe("nav items", () => {
  it("leaves out the synced-only Requests page for a local-only hotel, and includes it once synced", () => {
    expect(sideItems(true, false).some((i) => i.key === "requests")).toBe(false);
    expect(sideItems(true, true).some((i) => i.key === "requests")).toBe(true);
    expect(sideNav(true, false).groups.flatMap((g) => g.items).some((i) => i.key === "requests")).toBe(false);
    expect(sideNav(true, true).groups.flatMap((g) => g.items).some((i) => i.key === "requests")).toBe(true);
    expect(moreItems(true, false).some((i) => i.key === "requests")).toBe(false);
    expect(moreItems(true, true).some((i) => i.key === "requests")).toBe(true);
  });

  it("still respects simple mode regardless of sync", () => {
    expect(sideItems(false, true).some((i) => i.key === "payments")).toBe(false);
    expect(sideItems(true, true).some((i) => i.key === "payments")).toBe(true);
  });
});
