import { describe, expect, it } from "vitest";
import { aBooking, aSmallHotel } from "@/app/testing/fixtures";
import { calendarBars, occupiedCount } from "./calendar";

const stay = (id: string, cageId: string, checkIn: string, checkOut: string, over = {}) => aBooking(id, { petId: "p1", cageId, checkIn, checkOut, ...over });

describe("calendarBars", () => {
  // Window: 10 - 16 October (7 days, columns 0..6)
  const from = "2026-10-10";
  const data = aSmallHotel({
    bookings: [
      stay("inside", "s1", "2026-10-12", "2026-10-15"),
      stay("before", "s1", "2026-10-07", "2026-10-11"),
      stay("after", "s1", "2026-10-15", "2026-10-20"),
      stay("outside", "s1", "2026-10-01", "2026-10-10"),
      stay("later", "s1", "2026-10-17", "2026-10-18"),
      stay("cancelled", "s1", "2026-10-12", "2026-10-13", { status: "cancelled" }),
      stay("elsewhere", "s2", "2026-10-12", "2026-10-13"),
    ],
  });

  it("puts a stay on the nights it covers", () => {
    const bar = calendarBars(data, "s1", from, 7).find((b) => b.booking.id === "inside");
    expect(bar).toMatchObject({ start: 2, span: 3, continuesBefore: false, continuesAfter: false });
  });

  it("cuts a stay that runs off either edge, and says so", () => {
    const bars = calendarBars(data, "s1", from, 7);
    expect(bars.find((b) => b.booking.id === "before")).toMatchObject({ start: 0, span: 1, continuesBefore: true, continuesAfter: false });
    expect(bars.find((b) => b.booking.id === "after")).toMatchObject({ start: 5, span: 2, continuesBefore: false, continuesAfter: true });
  });

  it("leaves out stays that end when the window starts or begin after it, cancelled stays, and other cages", () => {
    const ids = calendarBars(data, "s1", from, 7).map((b) => b.booking.id);
    expect(ids).toEqual(["before", "inside", "after"]);
  });
});

describe("occupiedCount", () => {
  const data = aSmallHotel({
    bookings: [stay("a", "s1", "2026-10-12", "2026-10-14"), stay("b", "s2", "2026-10-13", "2026-10-15"), stay("c", "m1", "2026-10-12", "2026-10-13", { status: "checked_out" })],
  });

  it("counts cages with a pet that night, and treats check-out day as free", () => {
    expect(occupiedCount(data, "2026-10-12")).toBe(1);
    expect(occupiedCount(data, "2026-10-13")).toBe(2);
    expect(occupiedCount(data, "2026-10-14")).toBe(1);
    expect(occupiedCount(data, "2026-10-15")).toBe(0);
  });
});
