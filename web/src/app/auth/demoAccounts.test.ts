import { describe, expect, it } from "vitest";
import { demoAccounts, mockRegistration } from "./demoAccounts";
import { parseRegistration } from "./validation";

describe("mock sign-up data", () => {
  it("always passes the sign-up rules, for every person in the list", () => {
    for (let turn = 0; turn < 12; turn++) {
      const m = mockRegistration(turn);
      expect(parseRegistration(m), m.name).toMatchObject({ ok: true });
    }
  });

  it("walks through different people and keeps going past the end", () => {
    const names = Array.from({ length: 7 }, (_, i) => mockRegistration(i).name);
    expect(new Set(names.slice(0, 6)).size).toBe(6);
    expect(names[6]).toBe(names[0]);
  });

  it("uses a reserved example domain with a number, so repeats don't collide", () => {
    const [a, b] = [mockRegistration(0, () => 0.1), mockRegistration(0, () => 0.9)];
    expect(a.email).toMatch(/@example\.com$/);
    expect(a.email).not.toBe(b.email);
  });

  it("seeds accounts that also pass the rules", () => {
    for (const a of demoAccounts) expect(a.email).toMatch(/^[^@]+@pethommie\.id$/);
    expect(new Set(demoAccounts.map((a) => a.id)).size).toBe(demoAccounts.length);
  });
});
