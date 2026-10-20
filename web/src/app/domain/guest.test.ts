import { describe, expect, it } from "vitest";
import { aPet, aSmallHotel, anOwner } from "@/app/testing/fixtures";
import { guestFromRequest } from "./guest";

describe("guestFromRequest", () => {
  const data = aSmallHotel({ owners: [anOwner("o1", "6281234567890")], pets: [aPet("p1", "o1", { name: "Mochi" })] });

  it("uses the owner on record with that number, and their pet of that name", () => {
    expect(guestFromRequest(data, { owner: "Sari", wa: "6281234567890", petName: "mochi", species: "cat" })).toEqual({ ownerId: "o1", newOwner: null, petIds: ["p1"], newPet: null });
    expect(guestFromRequest(data, { owner: "Sari", wa: "0812 3456 7890", petName: "Kopi", species: "dog" })).toEqual({ ownerId: "o1", newOwner: null, petIds: [], newPet: { name: "Kopi", species: "dog" } });
  });

  it("starts a new owner and pet for a number nobody has", () => {
    expect(guestFromRequest(data, { owner: " Budi ", wa: "6285700000000", petName: "Bruno", species: "dragon" })).toEqual({ ownerId: null, newOwner: { name: "Budi", whatsapp: "6285700000000" }, petIds: [], newPet: { name: "Bruno", species: "cat" } });
  });
});
