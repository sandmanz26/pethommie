import { describe, expect, it } from "vitest";
import { aCareEntry } from "@/app/testing/fixtures";
import { arrivalNotice, bookingConfirmation, careText, dailyReport, pickupReminder, receiptMessage, vaccineReminder, waLink } from "./messages";

const base = { hotelName: "Rumah Meong", ownerName: "Sari Dewi", petName: "Mochi" };
const at = (h: number, m = 0) => new Date(2026, 9, 15, h, m).toISOString();

describe("waLink", () => {
  it("opens a chat with the number and the text filled in", () => {
    expect(waLink("6281234567890", "Halo & hai?")).toBe("https://wa.me/6281234567890?text=Halo%20%26%20hai%3F");
  });

  it("falls back to WhatsApp's own contact picker without a number", () => {
    expect(waLink("", "Hi")).toBe("https://wa.me/?text=Hi");
  });

  it("stays well inside what a browser and WhatsApp will open, even for a full day", () => {
    const entries = Array.from({ length: 12 }, (_, i) => aCareEntry(String(i), "b", { at: at(7 + i), kind: "note", preset: null, note: "Bermain di taman dan makan camilan favorit" }));
    const url = waLink("6281234567890", dailyReport({ ...base, date: "2026-10-15", day: 3, entries }));
    expect(url.length).toBeLessThan(4000);
  });
});

describe("careText", () => {
  it("says the one-tap answer, then anything typed", () => {
    expect(careText({ kind: "meal", preset: "most", note: "" })).toBe("hampir habis");
    expect(careText({ kind: "meal", preset: "little", note: "Pilih-pilih" })).toBe("baru sedikit, Pilih-pilih");
    expect(careText({ kind: "note", preset: null, note: "  Lucu  " })).toBe("Lucu");
  });
});

describe("dailyReport", () => {
  it("is addressed to the owner by first name and lists the day with times", () => {
    const text = dailyReport({
      ...base,
      date: "2026-10-15",
      day: 2,
      entries: [aCareEntry("a", "b", { at: at(8, 5), kind: "meal", preset: "all" }), aCareEntry("b", "b", { at: at(16, 30), kind: "play", preset: "20min" })],
    });
    expect(text).toContain("Halo Kak Sari");
    expect(text).toContain("Mochi hari ke-2");
    expect(text).toContain("Rumah Meong");
    expect(text).toMatch(/08[.:]05 .*Makan: habis/);
    expect(text).toMatch(/16[.:]30 .*Main: 20 menit/);
    expect(text).toContain("Mochi aman");
  });

  it("is always in Indonesian", () => {
    expect(dailyReport({ ...base, date: "2026-10-15", day: 1, entries: [] })).not.toMatch(/Report|Today|Day /);
  });

  it("is honest on a day with nothing logged", () => {
    expect(dailyReport({ ...base, date: "2026-10-15", day: 1, entries: [] })).toContain("Belum ada catatan khusus hari ini");
  });

  it("points the owner at an incident instead of saying all is fine", () => {
    const text = dailyReport({ ...base, date: "2026-10-15", day: 1, entries: [aCareEntry("i", "b", { kind: "incident", preset: null, note: "Mencakar kandang, lecet kecil" })] });
    expect(text).toContain("Mencakar kandang, lecet kecil");
    expect(text).toContain("Ada kejadian");
    expect(text).not.toContain("aman dan dalam pengawasan");
  });

  it("copes with a missing owner name", () => {
    expect(dailyReport({ ...base, ownerName: "", date: "2026-10-15", day: 1, entries: [] })).toMatch(/^Halo Kak 🐾/);
  });
});

describe("other messages", () => {
  it("confirms a booking with the total and what is left to pay", () => {
    const text = bookingConfirmation({ ...base, checkIn: "2026-10-14", checkOut: "2026-10-17", cageName: "S1", total: 150_000, paid: 50_000 });
    expect(text).toContain("3 malam");
    expect(text).toMatch(/Total: Rp\s?150\.000/);
    expect(text).toMatch(/Sisa: Rp\s?100\.000/);
  });

  it("says paid in full instead of a zero balance", () => {
    const text = bookingConfirmation({ ...base, checkIn: "2026-10-14", checkOut: "2026-10-17", cageName: "S1", total: 150_000, paid: 150_000 });
    expect(text).toContain("Lunas");
    expect(text).not.toContain("Sisa");
  });

  it("reports how the pet arrived, leaving out what wasn't recorded", () => {
    const text = arrivalNotice({ ...base, arrival: { at: at(10), healthy: true, fleaFree: false, weightKg: 4.2, belongings: "", food: "Royal Canin", notes: "" } });
    expect(text).toContain("tampak sehat");
    expect(text).toContain("Kutu/caplak: ditemukan");
    expect(text).toContain("4.2 kg");
    expect(text).toContain("Royal Canin");
    expect(text).not.toContain("Bawaan");
  });

  it("reminds about pickup with the balance", () => {
    expect(pickupReminder({ ...base, checkOut: "2026-10-17", balance: 100_000 })).toMatch(/Sisa pembayaran: Rp\s?100\.000/);
    expect(pickupReminder({ ...base, checkOut: "2026-10-17", balance: 0 })).toContain("lunas");
  });

  it("asks for a vaccine card in the way that fits the situation", () => {
    expect(vaccineReminder({ ...base, expiry: "2026-09-01", state: "expired" })).toContain("sudah habis");
    expect(vaccineReminder({ ...base, expiry: "2026-11-01", state: "soon" })).toContain("akan habis");
    expect(vaccineReminder({ ...base, expiry: "", state: "unknown" })).toContain("belum punya data vaksin");
  });
});

describe("receipt and overdue messages", () => {
  it("thanks for a payment and says what's left, or that it's settled", () => {
    const m = receiptMessage({ hotelName: "Rumah Meong", ownerName: "Rina K", petName: "Mochi", receipt: "KW-20261020-01", amount: 150_000, refund: false, method: "QRIS", balance: 50_000 });
    expect(m).toContain("Halo Kak Rina");
    expect(m).toMatch(/menerima Rp 150\.000 untuk penitipan Mochi \(QRIS\)/);
    expect(m).toContain("KW-20261020-01");
    expect(m).toMatch(/Sisa pembayaran: Rp 50\.000/);
    expect(receiptMessage({ hotelName: "H", ownerName: "", petName: "Kopi", receipt: "R", amount: 1, refund: true, method: "Cash", balance: 0, language: "en" })).toMatch(/has refunded[\s\S]*paid in full/);
  });
});
