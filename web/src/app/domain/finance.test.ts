import { describe, expect, it } from "vitest";
import { aBooking, aCage, aSmallHotel } from "@/app/testing/fixtures";
import { byCategory, expenseIssues, expensesCsv, expensesIn, financeMonths, monthsBetween, profitLoss, profitLossCsv, recurringToCopy } from "./finance";
import type { Expense, Payment } from "./types";

const spend = (id: string, date: string, category: Expense["category"], amount: number, over: Partial<Expense> = {}): Expense => ({ id, date, category, amount, method: "transfer", vendor: "", note: "", recurring: false, ...over });
const pay = (amount: number, at: string, kind: Payment["kind"] = "payment"): Payment => ({ id: at + amount + kind, at, amount, method: "cash", kind, reference: "", note: "" });

describe("months", () => {
  it("lists months across a year end, and picks the periods", () => {
    expect(monthsBetween("2026-11", "2027-02")).toEqual(["2026-11", "2026-12", "2027-01", "2027-02"]);
    expect(financeMonths("thisMonth", "2026-10-21")).toEqual(["2026-10"]);
    expect(financeMonths("lastMonth", "2027-01-05")).toEqual(["2026-12"]);
    expect(financeMonths("last3", "2026-10-21")).toEqual(["2026-08", "2026-09", "2026-10"]);
    expect(financeMonths("thisYear", "2026-03-02")).toEqual(["2026-01", "2026-02", "2026-03"]);
    expect(financeMonths("last12", "2026-10-21")).toHaveLength(12);
  });
});

describe("expenses", () => {
  it("wants a whole amount above zero, a real date and a known category", () => {
    expect(expenseIssues({ amount: 10_000, date: "2026-10-01", category: "food" })).toEqual([]);
    expect(expenseIssues({ amount: 0, date: "2026-13-45", category: "yacht" as never })).toEqual(["amount", "date", "category"]);
    expect(expenseIssues({ amount: 1.5, date: "2026-10-01", category: "rent" })).toEqual(["amount"]);
  });

  it("lists a month's expenses newest first, filtered by category or words, and totals them by category", () => {
    const data = { expenses: [spend("a", "2026-10-02", "food", 300_000, { vendor: "Toko Pakan Jaya" }), spend("b", "2026-10-15", "rent", 2_000_000), spend("c", "2026-09-30", "food", 1)] };
    expect(expensesIn(data, "2026-10").map((e) => e.id)).toEqual(["b", "a"]);
    expect(expensesIn(data, "2026-10", { q: "jaya", category: "all" }).map((e) => e.id)).toEqual(["a"]);
    expect(expensesIn(data, "2026-10", { q: "", category: "rent" }).map((e) => e.id)).toEqual(["b"]);
    expect(byCategory(expensesIn(data, "2026-10"))).toMatchObject({ food: 300_000, rent: 2_000_000, staff: 0 });
  });

  it("offers last month's recurring costs that aren't in this month yet, on the same day (or the month's last)", () => {
    const data = {
      expenses: [
        spend("rent", "2026-01-31", "rent", 2_000_000, { vendor: "Pak Budi", recurring: true }),
        spend("wage", "2026-01-25", "staff", 1_500_000, { vendor: "Sari", recurring: true }),
        spend("food", "2026-01-10", "food", 300_000),
        spend("wage-feb", "2026-02-25", "staff", 1_500_000, { vendor: "sari ", recurring: true }),
      ],
    };
    expect(recurringToCopy(data, "2026-02")).toEqual([expect.objectContaining({ category: "rent", amount: 2_000_000, date: "2026-02-28", recurring: true })]);
  });

  it("writes a spreadsheet saying which costs are direct", () => {
    const lines = expensesCsv([spend("a", "2026-10-02", "food", 300_000, { vendor: "Toko" }), spend("b", "2026-10-03", "rent", 5)]).trim().split("\r\n");
    expect(lines[0]).toBe("date,category,kind,amount,method,paid_to,note,recurring");
    expect(lines[1]).toBe("2026-10-02,food,direct,300000,transfer,Toko,,no");
    expect(lines[2]).toContain(",rent,operating,5,");
  });
});

describe("profit and loss", () => {
  // October: two cages at 50k. One stay of 4 nights finished (200k + 50k grooming - 20k discount), paid in October;
  // one cancelled stay kept its 40k deposit; one stay still running, its deposit paid in October.
  const data = {
    ...aSmallHotel({
      cages: [aCage("s1", "S", 50_000), aCage("s2", "S", 50_000)],
      bookings: [
        aBooking("done", { petId: "p1", cageId: "s1", checkIn: "2026-10-05", checkOut: "2026-10-09", status: "checked_out", charges: [{ id: "g", label: "Grooming", amount: 50_000 }, { id: "d", label: "Promo", amount: -20_000 }], payments: [pay(230_000, new Date(2026, 9, 9, 10).toISOString())] }),
        aBooking("gone", { petId: "p2", cageId: "s2", checkIn: "2026-10-12", checkOut: "2026-10-14", status: "cancelled", cancelReason: "no_show", payments: [pay(40_000, new Date(2026, 9, 1, 10).toISOString(), "deposit")] }),
        aBooking("now", { petId: "p2", cageId: "s2", checkIn: "2026-10-28", checkOut: "2026-11-02", status: "checked_in", payments: [pay(100_000, new Date(2026, 9, 28, 10).toISOString(), "deposit")] }),
      ],
    }),
    expenses: [spend("f", "2026-10-03", "food", 60_000), spend("v", "2026-10-04", "vet", 20_000), spend("r", "2026-10-01", "rent", 400_000), spend("s", "2026-10-25", "staff", 300_000), spend("x", "2026-09-30", "rent", 999)],
  };

  it("on accrual: the stays that ended, their add-ons and discounts, and the cancellation fees kept", () => {
    const pl = profitLoss(data, ["2026-10"], "accrual");
    expect(pl.revenue).toMatchObject({ boarding: 200_000, addOns: 50_000, discounts: 20_000, cancellationFees: 40_000, total: 270_000 });
  });

  it("on cash: the money received in the period, less refunds", () => {
    const pl = profitLoss(data, ["2026-10"], "cash");
    expect(pl.revenue.received).toBe(370_000);
    expect(pl.revenue.total).toBe(370_000);
  });

  it("splits costs into direct and operating, and works out gross and net profit and the margin", () => {
    const pl = profitLoss(data, ["2026-10"], "accrual");
    expect([pl.direct, pl.operating, pl.expenses]).toEqual([80_000, 700_000, 780_000]);
    expect(pl.grossProfit).toBe(190_000);
    expect(pl.netProfit).toBe(-510_000);
    expect(pl.margin).toBeCloseTo(-510_000 / 270_000);
    expect(pl.months).toEqual([{ month: "2026-10", revenue: 270_000, direct: 80_000, operating: 700_000, expenses: 780_000, profit: -510_000 }]);
  });

  it("knows the money per night sold, and how many nights a month cover the costs", () => {
    const pl = profitLoss(data, ["2026-10"], "accrual");
    // nights sold in October: 4 (done) + 4 (28 -> 31, running) = 8
    expect(pl.occupiedNights).toBe(8);
    expect(pl.revenuePerNight).toBe(270_000 / 8);
    expect(pl.directPerNight).toBe(10_000);
    // each night leaves 33,750 - 10,000 = 23,750 for 700,000 of fixed costs
    expect(pl.breakEven?.nightsPerMonth).toBeCloseTo(700_000 / 23_750);
    expect(pl.breakEven?.occupancy).toBeCloseTo(700_000 / 23_750 / (2 * 31));
  });

  it("has no break-even when a night doesn't cover its own costs, and no margin without revenue", () => {
    const costly = { ...data, expenses: [...data.expenses, spend("big", "2026-10-05", "food", 10_000_000)] };
    expect(profitLoss(costly, ["2026-10"], "accrual").breakEven).toBeNull();
    expect(profitLoss({ ...data, bookings: [] }, ["2026-10"], "accrual").margin).toBeNull();
  });

  it("takes off the PPh final estimate for a hotel on the final scheme", () => {
    const taxed = { ...data, settings: { ...data.settings, tax: { ...data.settings.tax, regime: "final_umkm" as const, taxpayer: "other" as const, basis: "cash" as const } } };
    const pl = profitLoss(taxed, ["2026-10"], "cash");
    expect(pl.taxEstimate).toBe(Math.round(370_000 * 0.005));
    expect(pl.afterTax).toBe(pl.netProfit - pl.taxEstimate);
  });

  it("writes the statement as a spreadsheet, costs negative", () => {
    const csv = profitLossCsv(profitLoss(data, ["2026-10"], "accrual"));
    expect(csv).toContain("revenue_total,270000");
    expect(csv).toContain("direct_food,-60000");
    expect(csv).toContain("net_profit,-510000");
    expect(csv).toContain("2026-10,270000,80000,700000,-510000");
  });
});
