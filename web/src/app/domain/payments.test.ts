import { describe, expect, it } from "vitest";
import { aBooking, aCage } from "@/app/testing/fixtures";
import { balanceDue, isValidAmount, paidAmount, paymentStatus, signedAmount } from "./payments";
import type { Payment } from "./types";

const pay = (amount: number): Payment => ({ id: String(amount), at: "2026-10-14T08:00:00.000Z", amount, method: "cash", kind: "payment" as const, reference: "", note: "" });
// 3 nights at 50.000 = 150.000
const stay = (...amounts: number[]) => aBooking("b", { petId: "p", cageId: "s1", checkIn: "2026-10-14", checkOut: "2026-10-17", payments: amounts.map(pay) });
const cage = aCage("s1");

describe("payments", () => {
  it("adds up everything received", () => {
    expect(paidAmount(stay())).toBe(0);
    expect(paidAmount(stay(50_000, 25_000))).toBe(75_000);
  });

  it("works out what is still owed, never below zero", () => {
    expect(balanceDue(stay(50_000), cage)).toBe(100_000);
    expect(balanceDue(stay(150_000), cage)).toBe(0);
    expect(balanceDue(stay(200_000), cage)).toBe(0);
  });

  it("calls a stay unpaid, part paid or paid", () => {
    expect(paymentStatus(stay(), cage)).toBe("unpaid");
    expect(paymentStatus(stay(1), cage)).toBe("partial");
    expect(paymentStatus(stay(149_999), cage)).toBe("partial");
    expect(paymentStatus(stay(150_000), cage)).toBe("paid");
    expect(paymentStatus(stay(160_000), cage)).toBe("paid");
  });

  it("does not call a stay with nothing to pay a debt", () => {
    expect(paymentStatus(stay(), undefined)).toBe("paid");
    expect(balanceDue(stay(), undefined)).toBe(0);
  });

  it("accepts only whole rupiah above zero", () => {
    expect(isValidAmount(1)).toBe(true);
    expect(isValidAmount(0)).toBe(false);
    expect(isValidAmount(-5)).toBe(false);
    expect(isValidAmount(10.5)).toBe(false);
    expect(isValidAmount(Number.NaN)).toBe(false);
  });
});

describe("refunds", () => {
  it("count against what a stay has kept, so the balance comes back", () => {
    const b = aBooking("b", {
      petId: "p1",
      cageId: "s1",
      checkIn: "2026-10-01",
      checkOut: "2026-10-03",
      payments: [
        { id: "1", at: "2026-10-01T08:00:00.000Z", amount: 100_000, method: "cash", kind: "payment", reference: "", note: "" },
        { id: "2", at: "2026-10-02T08:00:00.000Z", amount: 30_000, method: "transfer", kind: "refund", reference: "", note: "" },
      ],
    });
    expect(signedAmount(b.payments[1])).toBe(-30_000);
    expect(paidAmount(b)).toBe(70_000);
    expect(balanceDue(b, aCage("s1", "S", 50_000))).toBe(30_000);
  });
});
