import { describe, expect, it } from "vitest";
import { aBooking, aCage, aSmallHotel } from "@/app/testing/fixtures";
import { receivables, recentPayments } from "./payments";
import type { Payment } from "./types";

const pay = (amount: number, at = "2026-10-01T08:00:00.000Z"): Payment => ({ id: `${amount}-${at}`, at, amount, method: "cash", note: "" });
const stay = (id: string, status: "booked" | "checked_in" | "checked_out" | "cancelled", over = {}) =>
  aBooking(id, { petId: "p1", cageId: "s1", checkIn: "2026-10-10", checkOut: "2026-10-12", status, ...over }); // 2 nights = 100.000

describe("receivables", () => {
  const data = aSmallHotel({
    cages: [aCage("s1")],
    bookings: [
      stay("upcoming", "booked", { checkOut: "2026-10-30" }),
      stay("staying", "checked_in", { payments: [pay(40_000)] }),
      stay("left-late", "checked_out", { checkOut: "2026-10-12" }),
      stay("left-paid", "checked_out", { payments: [pay(100_000)] }),
      stay("cancelled", "cancelled"),
    ],
  });

  it("lists what is still owed, the ones who have left first", () => {
    expect(receivables(data).map((r) => [r.booking.id, r.group, r.balance])).toEqual([
      ["left-late", "left", 100_000],
      ["staying", "staying", 60_000],
      ["upcoming", "upcoming", 1_000_000],
    ]);
  });

  it("leaves out paid and cancelled stays", () => {
    const ids = receivables(data).map((r) => r.booking.id);
    expect(ids).not.toContain("left-paid");
    expect(ids).not.toContain("cancelled");
  });

  it("puts the oldest departure first inside a group", () => {
    const d = aSmallHotel({ cages: [aCage("s1")], bookings: [stay("b", "checked_out", { checkOut: "2026-10-20" }), stay("a", "checked_out", { checkOut: "2026-10-12" })] });
    expect(receivables(d).map((r) => r.booking.id)).toEqual(["a", "b"]);
  });
});

describe("recentPayments", () => {
  const data = aSmallHotel({
    bookings: [
      stay("a", "checked_out", { payments: [pay(1, "2026-10-01T08:00:00.000Z"), pay(2, "2026-10-03T08:00:00.000Z")] }),
      stay("b", "checked_in", { payments: [pay(3, "2026-10-02T08:00:00.000Z"), pay(4, "")] }),
    ],
  });

  it("is newest first across stays, and skips a payment with no usable time", () => {
    expect(recentPayments(data).map((r) => r.payment.amount)).toEqual([2, 3, 1]);
  });

  it("can be cut short", () => {
    expect(recentPayments(data, 2)).toHaveLength(2);
  });
});
