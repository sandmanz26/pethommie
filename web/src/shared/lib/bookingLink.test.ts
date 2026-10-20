import { describe, expect, it } from "vitest";
import { decodeCard, encodeCard, linkFor, prefillUrl, requestMessage, type LinkCard, type LinkRequest } from "./bookingLink";

const card: LinkCard = {
  v: 1,
  hotel: "Kandang Ceria · Pet Hotel",
  city: "Jakarta Selatan",
  wa: "6281399001122",
  lang: "id",
  units: "room",
  prices: [{ label: "Kandang kecil", price: 60_000 }, { label: "Ruang kucing (per anabul)", price: 55_000 }],
  species: ["cat", "dog"],
  note: "Wajib vaksin lengkap. Bawa makanan sendiri 🙏",
};
const request: LinkRequest = { ownerName: " Sari ", ownerWa: "0812-3456-7890", petName: "Mochi", species: "cat", breed: "Persia", checkIn: "2026-11-10", checkOut: "2026-11-13", preference: "Ruang kucing (per anabul)", notes: "Alergi ayam" };

describe("booking link", () => {
  it("round-trips a card through the link, emoji and all, in a URL-safe code", () => {
    const code = encodeCard(card);
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeCard(code)).toEqual(card);
    expect(linkFor("https://x.id", card)).toBe(`https://x.id/book#${code}`);
    expect(decodeCard(`#${code}`)).toEqual(card);
  });

  it("refuses a link that was cut off, edited or isn't ours", () => {
    const code = encodeCard(card);
    expect(decodeCard(code.slice(0, 20))).toBeNull();
    expect(decodeCard("hello")).toBeNull();
    expect(decodeCard(encodeCard({ ...card, wa: "12345" }))).toBeNull();
    expect(decodeCard(encodeCard({ ...card, hotel: "" }))).toBeNull();
    expect(decodeCard(encodeCard({ ...card, v: 2 } as unknown as LinkCard))).toBeNull();
  });

  it("cleans what it reads: bad prices dropped, unknown species ignored, long text cut", () => {
    const messy = { ...card, prices: [{ label: "ok", price: 1 }, { label: "", price: 5 }, { label: "neg", price: -3 }, { label: "nan", price: "x" }], species: ["cat", "dragon"], note: "x".repeat(1000) };
    const read = decodeCard(encodeCard(messy as unknown as LinkCard))!;
    expect(read.prices).toEqual([{ label: "ok", price: 1 }]);
    expect(read.species).toEqual(["cat"]);
    expect(read.note).toHaveLength(280);
  });

  it("writes the request for the hotel, in the hotel's language, with a one-tap way into Pethommie", () => {
    const m = requestMessage(card, request, "https://p.app");
    expect(m).toContain("Halo Kandang Ceria · Pet Hotel");
    expect(m).toContain("Pemilik: Sari (0812 3456 7890)");
    expect(m).toContain("Anabul: Mochi · kucing · Persia");
    expect(m).toMatch(/Tanggal: .+ → .+ \(3 malam\)/);
    expect(m).toContain("Pilihan: Ruang kucing (per anabul)");
    expect(m).toContain("Catatan: Alergi ayam");
    expect(m.trim().split("\n").at(-1)).toBe(prefillUrl("https://p.app", request));
    expect(requestMessage({ ...card, lang: "en" }, { ...request, preference: "", notes: "" }, "https://p.app")).not.toMatch(/Preference|Notes/);
  });

  it("prefills a new booking with the dates, the source and the guest", () => {
    const url = new URL(prefillUrl("https://p.app", request));
    expect(url.pathname).toBe("/app/bookings/new");
    expect(Object.fromEntries(url.searchParams)).toEqual({ in: "2026-11-10", out: "2026-11-13", source: "link", owner: "Sari", wa: "6281234567890", petName: "Mochi", species: "cat" });
  });
});
