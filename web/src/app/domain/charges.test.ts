import { describe, expect, it } from "vitest";
import { aBooking, aCage } from "@/app/testing/fixtures";
import { chargeIssues } from "./charges";
import { bookingTotal } from "./logic";
import { balanceDue, paymentStatus } from "./payments";

describe("chargeIssues", () => {
  it("takes an add-on and a discount, as whole rupiah that are not zero", () => {
    expect(chargeIssues({ label: "Grooming", amount: 75_000 })).toEqual([]);
    expect(chargeIssues({ label: "Diskon", amount: -25_000 })).toEqual([]);
  });

  it("needs words, and an amount", () => {
    expect(chargeIssues({ label: "  ", amount: 5 })).toEqual(["label"]);
    expect(chargeIssues({ label: "x".repeat(81), amount: 5 })).toEqual(["label"]);
    for (const amount of [0, 1.5, Number.NaN]) expect(chargeIssues({ label: "ok", amount })).toEqual(["amount"]);
  });
});

describe("what charges do to a stay's price", () => {
  const cage = aCage("s1"); // Rp 50.000 a night
  const stay = (charges: { id: string; label: string; amount: number }[]) => aBooking("b", { petId: "p", cageId: "s1", checkIn: "2026-10-14", checkOut: "2026-10-17", charges }); // 3 nights = 150.000

  it("adds add-ons and takes off discounts", () => {
    expect(bookingTotal(stay([]), cage)).toBe(150_000);
    expect(bookingTotal(stay([{ id: "1", label: "Grooming", amount: 75_000 }]), cage)).toBe(225_000);
    expect(bookingTotal(stay([{ id: "1", label: "Grooming", amount: 75_000 }, { id: "2", label: "Diskon", amount: -25_000 }]), cage)).toBe(200_000);
  });

  it("never goes below zero", () => {
    expect(bookingTotal(stay([{ id: "1", label: "Diskon", amount: -999_999 }]), cage)).toBe(0);
  });

  it("is what is owed, and so what counts as paid", () => {
    const b = stay([{ id: "1", label: "Grooming", amount: 50_000 }]);
    expect(balanceDue({ ...b, payments: [{ id: "p", at: "", amount: 150_000, method: "cash", note: "" }] }, cage)).toBe(50_000);
    expect(paymentStatus({ ...b, payments: [{ id: "p", at: "", amount: 200_000, method: "cash", note: "" }] }, cage)).toBe("paid");
  });
});
