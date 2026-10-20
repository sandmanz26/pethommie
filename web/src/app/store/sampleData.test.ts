import { describe, expect, it } from "vitest";
import { bookingIssues } from "@/app/domain/bookingRules";
import { placesUsed, totalPlaces } from "@/app/domain/logic";
import { paidAmount } from "@/app/domain/payments";
import { parseStored } from "./storage";
import { sampleData } from "./sampleData";
import { advancedSample } from "./sampleAdvanced";

describe("sample hotels", () => {
  it.each(["simple", "advanced"] as const)("the %s one is valid data that survives a save and a load", (kind) => {
    const data = sampleData(kind);
    const { data: again, problem } = parseStored(JSON.stringify(data));
    expect(problem).toBeNull();
    expect(again).toEqual(data);
  });

  it("is the same hotel every time for the same day", () => {
    const strip = (d: ReturnType<typeof advancedSample>) => d.bookings.map((b) => [b.checkIn, b.checkOut, b.status, b.source, b.payments.length, b.charges.length]);
    expect(strip(advancedSample("2026-10-20"))).toEqual(strip(advancedSample("2026-10-20")));
  });

  it("the advanced one is busy: months of stays, shared rooms, refunds, invoices", () => {
    const d = advancedSample("2026-10-20");
    expect(d.bookings.length).toBeGreaterThan(120);
    expect(d.cages.some((c) => c.capacity > 1)).toBe(true);
    expect(d.bookings.some((b) => b.payments.some((p) => p.kind === "refund"))).toBe(true);
    expect(d.bookings.some((b) => b.status === "checked_in")).toBe(true);
    expect(d.invoices.filter((i) => i.status === "void")).toHaveLength(2);
    expect(new Set(d.bookings.map((b) => b.source)).size).toBeGreaterThan(4);
  });

  it("the advanced one keeps every rule: no overbooked unit on any night, no pet in two places, no refund above what was paid", () => {
    const d = advancedSample("2026-10-20");
    for (const b of d.bookings) expect(bookingIssues(d, b), b.id).toEqual([]);
    for (const c of d.cages) {
      for (const b of d.bookings.filter((x) => x.cageId === c.id)) expect(placesUsed(d, c.id, b.checkIn)).toBeLessThanOrEqual(c.capacity);
    }
    for (const b of d.bookings) expect(paidAmount(b)).toBeGreaterThanOrEqual(0);
    expect(totalPlaces(d)).toBe(14 + 8 + 6);
  });
});
