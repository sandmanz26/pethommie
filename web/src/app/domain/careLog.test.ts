import { describe, expect, it } from "vitest";
import { aBooking, aCareEntry, aSmallHotel } from "@/app/testing/fixtures";
import { careIssues, entriesOn, hasIncident, reportWasSent, stayingToday } from "./careLog";

const inHouse = aBooking("b1", { petId: "p1", cageId: "s1", checkIn: "2026-10-14", checkOut: "2026-10-18", status: "checked_in" });
const waiting = aBooking("b2", { petId: "p2", cageId: "s2", checkIn: "2026-10-20", checkOut: "2026-10-22" });
const data = aSmallHotel({ bookings: [inHouse, waiting] });
const at = new Date(2026, 9, 15, 9, 30).toISOString();
const entry = (over: Partial<Parameters<typeof careIssues>[1]> = {}) => ({ bookingId: "b1", at, kind: "meal" as const, preset: "all", note: "", ...over });

describe("careIssues", () => {
  it("accepts a one-tap answer for a pet that is staying", () => {
    expect(careIssues(data, entry())).toEqual([]);
  });

  it("accepts a plain note", () => {
    expect(careIssues(data, entry({ kind: "note", preset: null, note: "Played with the ball" }))).toEqual([]);
  });

  it("only logs for a pet that is checked in", () => {
    expect(careIssues(data, entry({ bookingId: "b2" }))).toEqual(["not_staying"]);
    expect(careIssues(data, entry({ bookingId: "nope" }))).toEqual(["booking"]);
  });

  it("needs words for medicine, notes and incidents", () => {
    for (const kind of ["medicine", "note", "incident"] as const) {
      expect(careIssues(data, entry({ kind, preset: null, note: "  " }))).toEqual(["note_required"]);
    }
    expect(careIssues(data, entry({ kind: "medicine", preset: null, note: "Antibiotic, 1 tablet" }))).toEqual([]);
  });

  it("refuses an answer that doesn't belong to the kind, and an empty meal entry", () => {
    expect(careIssues(data, entry({ kind: "meal", preset: "pee" }))).toEqual(["preset"]);
    expect(careIssues(data, entry({ preset: null, note: "" }))).toEqual(["note_required"]);
  });

  it("refuses a time that isn't one", () => {
    expect(careIssues(data, entry({ at: "yesterday-ish" }))).toEqual(["time"]);
  });
});

describe("entriesOn / stayingToday", () => {
  const log = [
    aCareEntry("late", "b1", { at: new Date(2026, 9, 15, 18, 0).toISOString() }),
    aCareEntry("early", "b1", { at: new Date(2026, 9, 15, 8, 0).toISOString() }),
    aCareEntry("other-day", "b1", { at: new Date(2026, 9, 14, 8, 0).toISOString() }),
    aCareEntry("other-pet", "b2", { at: new Date(2026, 9, 15, 8, 0).toISOString() }),
  ];
  const withLog = aSmallHotel({ bookings: [inHouse, waiting], careLog: log, reportsSent: [{ bookingId: "b1", date: "2026-10-14", at }] });

  it("lists one pet's day, earliest first", () => {
    expect(entriesOn(withLog, "b1", "2026-10-15").map((e) => e.id)).toEqual(["early", "late"]);
  });

  it("knows whether a day's report went out", () => {
    expect(reportWasSent(withLog, "b1", "2026-10-14")).toBe(true);
    expect(reportWasSent(withLog, "b1", "2026-10-15")).toBe(false);
  });

  it("spots an incident", () => {
    expect(hasIncident(log)).toBe(false);
    expect(hasIncident([aCareEntry("x", "b1", { kind: "incident", preset: null, note: "Scratched" })])).toBe(true);
  });

  it("lists only the pets that are in, with what is still to do", () => {
    const rows = stayingToday(withLog, "2026-10-15");
    expect(rows.map((r) => r.booking.id)).toEqual(["b1"]);
    expect(rows[0]).toMatchObject({ reportSent: false, incident: false });
    expect(rows[0].entries).toHaveLength(2);
    expect(stayingToday(withLog, "2026-10-14")[0].reportSent).toBe(true);
  });
});
