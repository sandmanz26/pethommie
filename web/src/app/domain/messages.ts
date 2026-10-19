import { formatRupiah, formatDate, nights, timeOf } from "./logic";
import type { Arrival, CareEntry, CareKind, ISODate } from "./types";

/**
 * Messages an operator sends to a pet's owner on WhatsApp. Pure text builders, so they can be tested and
 * reused. Always Bahasa Indonesia: the owners are Indonesian, whatever language the operator's screen is in.
 *
 * No WhatsApp API is involved. `waLink` makes a click-to-chat link that opens the operator's own WhatsApp
 * with the text filled in; they press send. Free, and it comes from their own number.
 */

const LOCALE = "id";
const date = (d: ISODate) => formatDate(d, LOCALE, { day: "numeric", month: "short" });
const rp = (n: number) => formatRupiah(n, LOCALE).replace(/\s/g, " ");

export const CARE_EMOJI: Record<CareKind, string> = {
  meal: "🍽️",
  drink: "💧",
  play: "🎾",
  toilet: "🚽",
  medicine: "💊",
  mood: "😺",
  note: "📝",
  incident: "⚠️",
};

/** Indonesian name of each kind, as the owner reads it. */
export const CARE_LABEL_ID: Record<CareKind, string> = {
  meal: "Makan",
  drink: "Minum",
  play: "Main",
  toilet: "BAB/BAK",
  medicine: "Obat",
  mood: "Mood",
  note: "Catatan",
  incident: "Kejadian",
};

/** What each one-tap answer says to the owner. */
export const CARE_PRESET_ID: Record<CareKind, Record<string, string>> = {
  meal: { all: "habis", most: "hampir habis", little: "baru sedikit", none: "belum mau makan" },
  drink: { normal: "minum normal", a_lot: "minum banyak", little: "minum sedikit" },
  play: { "10min": "10 menit", "20min": "20 menit", "30min": "30 menit" },
  toilet: { pee: "BAK normal", poop: "BAB normal", both: "BAB dan BAK normal", loose: "BAB agak encer" },
  medicine: {},
  mood: { happy: "ceria", calm: "santai", quiet: "agak pendiam", stressed: "tampak stres" },
  note: {},
  incident: {},
};

/** The words for one entry: the one-tap answer, then anything typed. */
export function careText(entry: Pick<CareEntry, "kind" | "preset" | "note">): string {
  const preset = entry.preset ? CARE_PRESET_ID[entry.kind][entry.preset] : "";
  return [preset, entry.note.trim()].filter(Boolean).join(", ");
}

/** https://wa.me/62...?text=...  Without a number it opens WhatsApp's own contact picker instead. */
export function waLink(whatsapp: string, text: string): string {
  return `https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}`;
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] || "";
const greeting = (ownerName: string) => `Halo Kak ${firstName(ownerName)} 🐾`.replace("Kak  ", "Kak ").trim();

export function dailyReport(p: {
  hotelName: string;
  ownerName: string;
  petName: string;
  date: ISODate;
  day: number;
  entries: CareEntry[];
}): string {
  const lines = p.entries.map((e) => `${timeOf(e.at, LOCALE)} ${CARE_EMOJI[e.kind]} ${CARE_LABEL_ID[e.kind]}: ${careText(e) || "-"}`);
  const incident = p.entries.some((e) => e.kind === "incident");
  const closing = incident
    ? "Ada kejadian yang kami catat di atas. Kabari kami kalau ada yang ingin ditanyakan ya."
    : lines.length
      ? `${p.petName} aman dan dalam pengawasan kami. Kalau ada pesan untuk ${p.petName}, kabari ya!`
      : `${p.petName} aman dan dalam pengawasan kami. Belum ada catatan khusus hari ini.`;
  return [
    greeting(p.ownerName),
    `Rapor ${p.petName} hari ke-${p.day} (${date(p.date)}) di ${p.hotelName}:`,
    ...(lines.length ? ["", ...lines] : []),
    "",
    closing,
  ].join("\n");
}

export function bookingConfirmation(p: {
  hotelName: string;
  ownerName: string;
  petName: string;
  checkIn: ISODate;
  checkOut: ISODate;
  cageName: string;
  total: number;
  paid: number;
}): string {
  const n = nights(p.checkIn, p.checkOut);
  const balance = Math.max(0, p.total - p.paid);
  return [
    greeting(p.ownerName),
    `Booking ${p.petName} di ${p.hotelName} sudah kami catat:`,
    `• Tanggal: ${date(p.checkIn)} - ${date(p.checkOut)} (${n} malam)`,
    `• Kandang: ${p.cageName}`,
    `• Total: ${rp(p.total)}`,
    p.paid > 0 ? `• Sudah dibayar: ${rp(p.paid)}` : "• Belum ada pembayaran",
    balance > 0 ? `• Sisa: ${rp(balance)}` : "• Lunas ✅",
    "",
    "Mohon bawa kartu vaksin dan makanan kesukaan " + p.petName + " saat datang. Terima kasih!",
  ].join("\n");
}

export function arrivalNotice(p: { hotelName: string; ownerName: string; petName: string; arrival: Arrival }): string {
  const a = p.arrival;
  return [
    greeting(p.ownerName),
    `${p.petName} sudah check-in di ${p.hotelName}. Kondisi saat tiba:`,
    `• Kesehatan: ${a.healthy ? "tampak sehat" : "perlu perhatian"}`,
    `• Kutu/caplak: ${a.fleaFree ? "tidak terlihat" : "ditemukan"}`,
    ...(a.weightKg !== null ? [`• Berat: ${a.weightKg} kg`] : []),
    ...(a.belongings.trim() ? [`• Bawaan: ${a.belongings.trim()}`] : []),
    ...(a.food.trim() ? [`• Makanan: ${a.food.trim()}`] : []),
    ...(a.notes.trim() ? [`• Catatan: ${a.notes.trim()}`] : []),
    "",
    "Kami akan kirim kabar setiap hari. Terima kasih sudah percaya pada kami 🙏",
  ].join("\n");
}

export function pickupReminder(p: { hotelName: string; ownerName: string; petName: string; checkOut: ISODate; balance: number }): string {
  return [
    greeting(p.ownerName),
    `Pengingat: ${p.petName} dijadwalkan dijemput ${date(p.checkOut)} dari ${p.hotelName}.`,
    p.balance > 0 ? `Sisa pembayaran: ${rp(p.balance)}.` : "Pembayaran sudah lunas ✅",
    "",
    "Kabari kami jam berapa akan datang ya. Terima kasih!",
  ].join("\n");
}

export function vaccineReminder(p: {
  hotelName: string;
  ownerName: string;
  petName: string;
  expiry: ISODate | "";
  state: "expired" | "soon" | "unknown";
}): string {
  const status =
    p.state === "expired"
      ? `masa berlaku vaksin ${p.petName} sudah habis (${date(p.expiry as ISODate)})`
      : p.state === "soon"
        ? `vaksin ${p.petName} akan habis masa berlakunya pada ${date(p.expiry as ISODate)}`
        : `kami belum punya data vaksin ${p.petName}`;
  return [
    greeting(p.ownerName),
    `Dari ${p.hotelName}: ${status}.`,
    "Mohon kirimkan foto kartu vaksin terbaru sebelum check-in ya. Terima kasih!",
  ].join("\n");
}
