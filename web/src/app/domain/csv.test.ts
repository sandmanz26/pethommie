import { describe, expect, it } from "vitest";
import { aBooking, aCage, aPet, aSmallHotel, anOwner } from "@/app/testing/fixtures";
import { staysCsv, toCsv } from "./csv";

describe("toCsv", () => {
  it("quotes what needs it and doubles inner quotes", () => {
    expect(toCsv([["a", "b,c", 'say "hi"', "line\nbreak"]])).toBe('a,"b,c","say ""hi""","line\nbreak"\r\n');
  });

  it("keeps a spreadsheet from running a name as a formula", () => {
    for (const evil of ["=HYPERLINK(1)", "+1", "-1", "@SUM(A1)"]) expect(toCsv([[evil]])).toBe(`'${evil}\r\n`);
  });
});

describe("staysCsv", () => {
  const data = aSmallHotel({
    owners: [anOwner("o1", "6281234567890")],
    pets: [aPet("p1", "o1", { name: "=Mochi" })],
    cages: [aCage("s1")],
    bookings: [
      aBooking("b2", { petId: "p1", cageId: "s1", checkIn: "2026-10-20", checkOut: "2026-10-21", status: "cancelled" }),
      aBooking("b1", { petId: "p1", cageId: "s1", checkIn: "2026-10-10", checkOut: "2026-10-12", notes: "likes, toys", payments: [{ id: "x", at: "", amount: 30_000, method: "cash", kind: "payment" as const, reference: "", note: "" }] }),
    ],
  });
  const lines = staysCsv(data).trim().split("\r\n");

  it("has a header and one row per stay, earliest first", () => {
    expect(lines[0]).toBe("check_in,check_out,nights,status,pet,owner,whatsapp,cage,total,paid,balance,notes,source");
    expect(lines).toHaveLength(3);
    expect(lines[1].startsWith("2026-10-10,2026-10-12,2,booked,")).toBe(true);
  });

  it("carries money and neutralises the pet name", () => {
    expect(lines[1]).toContain("'=Mochi");
    expect(lines[1]).toContain(",100000,30000,70000,");
    expect(lines[1].endsWith('"likes, toys",other')).toBe(true);
  });

  it("lists only the stays it is given, when given some", () => {
    expect(staysCsv(data, [data.bookings[0]]).trim().split("\r\n")).toHaveLength(2);
  });

  it("shows no balance for a cancelled stay", () => {
    expect(lines[2]).toContain(",cancelled,");
    expect(lines[2].split(",").slice(-4, -2)).toEqual(["0", "0"]);
  });
});
