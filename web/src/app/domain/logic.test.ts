import { describe, expect, it } from "vitest";
import { aBooking, aCage, aHotel, aPet, aSmallHotel } from "@/app/testing/fixtures";
import {
  addDays,
  bookingTotal,
  cageIsFree,
  formatDate,
  formatRupiah,
  freeCages,
  generateCages,
  nights,
  occupantOn,
  overlaps,
  todayBoard,
  todayISO,
  vaccineState,
} from "./logic";

describe("dates", () => {
  it("formats a local calendar day with zero padding", () => {
    expect(todayISO(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });

  it("adds days across month, year and leap-day boundaries", () => {
    expect(addDays("2026-02-27", 2)).toBe("2026-03-01");
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("counts nights between two days", () => {
    expect(nights("2026-10-14", "2026-10-18")).toBe(4);
    expect(nights("2026-10-14", "2026-10-14")).toBe(0);
    expect(nights("2026-10-18", "2026-10-14")).toBe(-4);
    expect(nights("2026-12-30", "2027-01-02")).toBe(3);
  });
});

describe("overlaps", () => {
  it("lets one stay start on the day another ends", () => {
    expect(overlaps("2026-10-10", "2026-10-12", "2026-10-12", "2026-10-14")).toBe(false);
    expect(overlaps("2026-10-12", "2026-10-14", "2026-10-10", "2026-10-12")).toBe(false);
  });

  it("detects partial and contained overlaps", () => {
    expect(overlaps("2026-10-10", "2026-10-13", "2026-10-12", "2026-10-14")).toBe(true);
    expect(overlaps("2026-10-10", "2026-10-20", "2026-10-12", "2026-10-14")).toBe(true);
    expect(overlaps("2026-10-12", "2026-10-14", "2026-10-10", "2026-10-20")).toBe(true);
  });
});

describe("cage availability", () => {
  const stay = aBooking("b1", { petId: "p1", cageId: "s1", checkIn: "2026-10-14", checkOut: "2026-10-18" });

  it("is taken during a booked stay, free on the check-out day and before check-in", () => {
    const data = aSmallHotel({ bookings: [stay] });
    expect(cageIsFree(data, "s1", "2026-10-16", "2026-10-17")).toBe(false);
    expect(cageIsFree(data, "s1", "2026-10-12", "2026-10-15")).toBe(false);
    expect(cageIsFree(data, "s1", "2026-10-18", "2026-10-20")).toBe(true);
    expect(cageIsFree(data, "s1", "2026-10-10", "2026-10-14")).toBe(true);
    expect(cageIsFree(data, "s2", "2026-10-16", "2026-10-17")).toBe(true);
  });

  it("is held by a checked-in stay, but not by a cancelled or finished one", () => {
    const at = (status: "checked_in" | "cancelled" | "checked_out") => aSmallHotel({ bookings: [{ ...stay, status }] });
    expect(cageIsFree(at("checked_in"), "s1", "2026-10-15", "2026-10-16")).toBe(false);
    expect(cageIsFree(at("cancelled"), "s1", "2026-10-15", "2026-10-16")).toBe(true);
    expect(cageIsFree(at("checked_out"), "s1", "2026-10-15", "2026-10-16")).toBe(true);
  });

  it("ignores the booking being edited", () => {
    const data = aSmallHotel({ bookings: [stay] });
    expect(cageIsFree(data, "s1", "2026-10-15", "2026-10-19", "b1")).toBe(true);
    expect(cageIsFree(data, "s1", "2026-10-15", "2026-10-19", "other")).toBe(false);
  });

  it("lists free cages, optionally by size", () => {
    const data = aSmallHotel({ bookings: [stay] });
    expect(freeCages(data, "2026-10-15", "2026-10-16").map((c) => c.id)).toEqual(["s2", "m1"]);
    expect(freeCages(data, "2026-10-15", "2026-10-16", "M").map((c) => c.id)).toEqual(["m1"]);
  });

  it("finds who sleeps in a cage on a given night, and nobody on the check-out night", () => {
    const data = aSmallHotel({ bookings: [stay] });
    expect(occupantOn(data, "s1", "2026-10-14")?.id).toBe("b1");
    expect(occupantOn(data, "s1", "2026-10-17")?.id).toBe("b1");
    expect(occupantOn(data, "s1", "2026-10-18")).toBeUndefined();
  });
});

describe("money", () => {
  it("bills nights times the nightly rate", () => {
    expect(bookingTotal({ checkIn: "2026-10-14", checkOut: "2026-10-18" }, aCage("s1", "S", 50_000))).toBe(200_000);
  });

  it("is zero for a missing cage or backwards dates", () => {
    expect(bookingTotal({ checkIn: "2026-10-14", checkOut: "2026-10-18" }, undefined)).toBe(0);
    expect(bookingTotal({ checkIn: "2026-10-18", checkOut: "2026-10-14" }, aCage("s1"))).toBe(0);
  });

  it("formats rupiah with dot separators and no decimals", () => {
    expect(formatRupiah(1_250_000, "id").replace(/\s/g, " ")).toBe("Rp 1.250.000");
    expect(formatRupiah(50_000, "en")).toMatch(/50[.,]000/);
  });

  it("formats dates per language", () => {
    expect(formatDate("2026-10-14", "en")).toBe("14 Oct 2026");
    expect(formatDate("2026-10-14", "id")).toBe("14 Okt 2026");
  });
});

describe("vaccineState", () => {
  const on = "2026-10-14";
  const withExpiry = (vaccineExpiry: string) => aPet("p", "o", { vaccineExpiry });

  it("is unknown without a date", () => {
    expect(vaccineState(withExpiry(""), on)).toBe("unknown");
  });

  it("is expired only after the expiry day has passed", () => {
    expect(vaccineState(withExpiry("2026-10-13"), on)).toBe("expired");
    expect(vaccineState(withExpiry("2026-10-14"), on)).toBe("soon");
  });

  it("is 'soon' for the next 29 days and ok from day 30", () => {
    expect(vaccineState(withExpiry(addDays(on, 29)), on)).toBe("soon");
    expect(vaccineState(withExpiry(addDays(on, 30)), on)).toBe("ok");
  });
});

describe("todayBoard", () => {
  const today = "2026-10-14";
  const data = aSmallHotel({
    bookings: [
      aBooking("arr", { petId: "p1", cageId: "s1", checkIn: today, checkOut: "2026-10-16" }),
      aBooking("late", { petId: "p2", cageId: "s2", checkIn: "2026-10-12", checkOut: "2026-10-15" }),
      aBooking("in", { petId: "p1", cageId: "m1", checkIn: "2026-10-11", checkOut: "2026-10-16", status: "checked_in" }),
      aBooking("out", { petId: "p2", cageId: "s1", checkIn: "2026-10-10", checkOut: today, status: "checked_in" }),
      aBooking("gone", { petId: "p2", cageId: "s2", checkIn: today, checkOut: "2026-10-16", status: "cancelled" }),
    ],
  });
  const board = todayBoard(data, today);

  it("sorts stays into arriving, late, in house and leaving", () => {
    expect(board.arriving.map((b) => b.id)).toEqual(["arr"]);
    expect(board.lateArrivals.map((b) => b.id)).toEqual(["late"]);
    expect(board.inHouse.map((b) => b.id).sort()).toEqual(["in", "out"]);
    expect(board.leaving.map((b) => b.id)).toEqual(["out"]);
  });

  it("ignores cancelled stays and counts cages nobody sleeps in tonight", () => {
    expect(board.arriving.some((b) => b.id === "gone")).toBe(false);
    // s1 is taken by "arr" (from today), m1 by "in"; s2 by "late" (not checked in, but holds until 15th).
    expect(board.freeTonight).toBe(0);
    expect(todayBoard(aHotel({ cages: [aCage("x")] }), today).freeTonight).toBe(1);
  });
});

describe("generateCages", () => {
  const cages = generateCages({ S: { count: 3, price: 50_000 }, M: { count: 0, price: 75_000 }, L: { count: 1, price: 120_000 } });

  it("names cages by size and number, with each size's price", () => {
    expect(cages.map((c) => c.name)).toEqual(["S-01", "S-02", "S-03", "L-01"]);
    expect(cages.map((c) => c.pricePerNight)).toEqual([50_000, 50_000, 50_000, 120_000]);
  });

  it("gives every cage its own id", () => {
    expect(new Set(cages.map((c) => c.id)).size).toBe(cages.length);
  });
});
