import { describe, expect, it } from "vitest";
import { demoAccounts, isDemoId } from "./demoAccounts";

describe("the demo hotels", () => {
  it("have their own ids, which no real account can have", () => {
    expect(new Set(demoAccounts.map((a) => a.id)).size).toBe(demoAccounts.length);
    for (const a of demoAccounts) expect(a.id).toMatch(/^demo-/);
    expect(isDemoId("demo-rina")).toBe(true);
    expect(isDemoId(crypto.randomUUID())).toBe(false);
  });

  it("carry no password: they are opened from Try now, never logged in to", () => {
    for (const a of demoAccounts) expect(a).not.toHaveProperty("password");
  });
});
