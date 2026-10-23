import { describe, expect, it } from "vitest";
import { aBooking, aSmallHotel } from "@/app/testing/fixtures";
import { calendarBars, calendarRange, dayStays, occupiedCount, rangeTitle, shiftAnchor, startOfWeek } from "./calendar";

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

describe("calendar views", () => {
  it("starts a week on Monday and a month on the 1st", () => {
    expect(startOfWeek("2026-10-23")).toBe("2026-10-19"); // a Friday
    expect(startOfWeek("2026-10-19")).toBe("2026-10-19");
    expect(startOfWeek("2026-10-25")).toBe("2026-10-19"); // a Sunday
    expect(calendarRange("week", "2026-10-23")).toEqual({ from: "2026-10-19", days: 7 });
    expect(calendarRange("month", "2026-10-23")).toEqual({ from: "2026-10-01", days: 31 });
    expect(calendarRange("month", "2028-02-10")).toEqual({ from: "2028-02-01", days: 29 });
  });

  it("pages by a week or a month, across the year end", () => {
    expect(shiftAnchor("week", "2026-10-23", 1)).toBe("2026-10-26");
    expect(shiftAnchor("week", "2026-10-23", -1)).toBe("2026-10-12");
    expect(shiftAnchor("month", "2026-12-31", 1)).toBe("2027-01-01");
    expect(shiftAnchor("month", "2026-01-31", -1)).toBe("2025-12-01");
  });

  it("titles the range", () => {
    expect(rangeTitle("week", "2026-10-19", 7, "en")).toBe("19–25 Oct 2026");
    expect(rangeTitle("week", "2026-09-28", 7, "en")).toMatch(/^28 Sept? – 4 Oct 2026$/);
    expect(rangeTitle("week", "2026-12-28", 7, "en")).toBe("28 Dec 2026 – 3 Jan 2027");
    expect(rangeTitle("month", "2026-10-01", 31, "en")).toBe("October 2026");
  });
});

describe("dayStays", () => {
  const data = aSmallHotel({
    bookings: [
      stay("in", "s1", "2026-10-12", "2026-10-14"),
      stay("over", "s1", "2026-10-10", "2026-10-13"),
      stay("out", "s1", "2026-10-09", "2026-10-12", { status: "checked_out" }),
      stay("gone", "s1", "2026-10-12", "2026-10-13", { status: "cancelled" }),
      stay("other", "s2", "2026-10-12", "2026-10-13"),
    ],
  });

  it("splits a unit's day into arriving, staying and leaving, without cancelled stays", () => {
    const ids = (k: keyof ReturnType<typeof dayStays>, cage: string | null) => dayStays(data, cage, "2026-10-12")[k].map((b) => b.id);
    expect(ids("arriving", "s1")).toEqual(["in"]);
    expect(ids("staying", "s1")).toEqual(["over"]);
    expect(ids("leaving", "s1")).toEqual(["out"]);
    expect(ids("arriving", null)).toEqual(["in", "other"]);
  });
});
