import { describe, expect, it } from "vitest";
import { leaksFor, rupiah } from "./leaks";

describe("leaksFor", () => {
  it("adds up the three money leaks of a typical small hotel", () => {
    // 12 cages × 30 nights × 60% × Rp 75.000 = Rp 16.200.000 billed
    const l = leaksFor({ cages: 12, rate: 75_000, occupancy: 60 });
    expect(l.billed).toBe(16_200_000);
    expect(l.empty).toBe(900_000); // 12 lost nights
    expect(l.unpaid).toBe(486_000); // 3%
    expect(l.extras).toBe(324_000); // 2%
    expect(l.total).toBe(1_710_000);
    expect(l.year).toBe(20_520_000);
    expect(l.hours).toBe(30);
  });

  it("never counts more lost nights than the nights that were actually free", () => {
    expect(leaksFor({ cages: 10, rate: 100_000, occupancy: 100 }).empty).toBe(0);
    // 10 cages, 98% full: 6 free nights in the month, fewer than the 10 assumed
    expect(leaksFor({ cages: 10, rate: 100_000, occupancy: 98 }).empty).toBe(600_000);
  });

  it("grows with the hotel", () => {
    const small = leaksFor({ cages: 6, rate: 60_000, occupancy: 50 });
    const big = leaksFor({ cages: 40, rate: 120_000, occupancy: 70 });
    expect(big.total).toBeGreaterThan(small.total * 10);
  });
});

describe("rupiah", () => {
  it("groups thousands with dots", () => {
    expect(rupiah(1_710_000)).toBe("Rp 1.710.000");
  });
});
