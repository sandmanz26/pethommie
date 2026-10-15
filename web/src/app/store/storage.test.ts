import { describe, expect, it, vi } from "vitest";
import { emptyData } from "@/app/domain/types";
import { aSmallHotel } from "@/app/testing/fixtures";
import { BACKUP_KEY, localRepository, parseStored, STORAGE_KEY } from "./storage";

describe("parseStored", () => {
  it("treats nothing stored as a fresh start, not a problem", () => {
    expect(parseStored(null)).toEqual({ data: emptyData(), problem: null });
  });

  it("reads back what was saved", () => {
    const data = aSmallHotel();
    expect(parseStored(JSON.stringify(data))).toEqual({ data, problem: null });
  });

  it.each([
    ["not JSON", "{oops"],
    ["a number", "42"],
    ["an array", "[]"],
    ["no version", JSON.stringify({ hotel: null, cages: [], owners: [], pets: [], bookings: [] })],
    ["a list that isn't a list", JSON.stringify({ ...aSmallHotel(), cages: null })],
    ["a record without an id", JSON.stringify({ ...aSmallHotel(), pets: [{ name: "x" }] })],
    ["a hotel without a name", JSON.stringify({ ...aSmallHotel(), hotel: { city: "x" } })],
    ["an impossible version", JSON.stringify({ ...aSmallHotel(), version: 0 })],
  ])("flags %s as corrupt, and returns empty data", (_label, raw) => {
    expect(parseStored(raw)).toEqual({ data: emptyData(), problem: "corrupt" });
  });

  it("flags data from a newer version of the app, without trying to read it", () => {
    const raw = JSON.stringify({ ...aSmallHotel(), version: 2, somethingNew: true });
    expect(parseStored(raw)).toEqual({ data: emptyData(), problem: "newer" });
  });
});

describe("localRepository", () => {
  it("round-trips data through localStorage", () => {
    const data = aSmallHotel();
    expect(localRepository.save(data)).toBe(true);
    expect(localRepository.load()).toEqual(data);
  });

  it("loads empty data on a first visit and writes no backup", () => {
    expect(localRepository.load()).toEqual(emptyData());
    expect(localStorage.getItem(BACKUP_KEY)).toBeNull();
  });

  it("keeps a copy of unreadable data before anything can overwrite it", () => {
    localStorage.setItem(STORAGE_KEY, "{corrupt");
    expect(localRepository.load()).toEqual(emptyData());
    expect(localStorage.getItem(BACKUP_KEY)).toBe("{corrupt");
  });

  it("keeps newer-version data safe in the backup too", () => {
    const raw = JSON.stringify({ ...aSmallHotel(), version: 7 });
    localStorage.setItem(STORAGE_KEY, raw);
    expect(localRepository.load()).toEqual(emptyData());
    expect(localStorage.getItem(BACKUP_KEY)).toBe(raw);
  });

  it("reports a failed save instead of pretending it worked", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    expect(localRepository.save(aSmallHotel())).toBe(false);
  });

  it("survives storage being blocked entirely", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    expect(localRepository.load()).toEqual(emptyData());
  });

  it("clears", () => {
    localRepository.save(aSmallHotel());
    localRepository.clear();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
