import { describe, expect, it } from "vitest";
import { decodeCard, encodeCard } from "@/shared/lib/bookingLink";
import { aCage, aSmallHotel } from "@/app/testing/fixtures";
import { cardFor, defaultLinkOptions, priceList } from "./linkCard";

const data = aSmallHotel({ cages: [aCage("s1", "S", 50_000), aCage("s2", "S", 60_000), aCage("l1", "L", 120_000), { ...aCage("r", "M", 45_000, 6), name: "Ruang Kucing" }] });

describe("the booking link card", () => {
  it("lists one price per size, the lowest marked 'from' when they differ, and each shared room per pet", () => {
    expect(priceList(data, "id")).toEqual([
      { label: "Kandang kecil (mulai)", price: 50_000 },
      { label: "Kandang besar", price: 120_000 },
      { label: "Ruang Kucing (per anabul)", price: 45_000 },
    ]);
    expect(priceList({ ...data, settings: { ...data.settings, unitTerm: "room" } }, "en")[1].label).toBe("Room large");
  });

  it("carries the hotel, its number and the owner's choices; prices can be left out", () => {
    const card = cardFor(data, { ...defaultLinkOptions(data), showPrices: false, note: " Vaksin wajib " })!;
    expect(card).toMatchObject({ hotel: "Rumah Meong", city: "Bintaro", wa: "6281234567890", prices: [], species: ["cat", "dog"], note: "Vaksin wajib" });
    expect(decodeCard(encodeCard(card))).toEqual(card);
  });

  it("can't be made without a WhatsApp number to send requests to", () => {
    expect(cardFor({ ...data, hotel: { ...data.hotel!, whatsapp: "" } }, defaultLinkOptions(data))).toBeNull();
  });
});
