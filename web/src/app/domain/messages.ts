import { formatRupiah, formatDate, nights, timeOf } from "./logic";
import type { Arrival, CareEntry, CareKind, ISODate, Invoice, Language } from "./types";

/**
 * Messages an operator sends to a pet's owner on WhatsApp. Pure text builders, so they can be tested and
 * reused. Written in the owner's own language (Indonesian unless the owner is set to English), whatever language the operator's screen is in.
 *
 * No WhatsApp API is involved. `waLink` makes a click-to-chat link that opens the operator's own WhatsApp
 * with the text filled in; they press send. Free, and it comes from their own number.
 */

const date = (d: ISODate, lang: Language) => formatDate(d, lang, { day: "numeric", month: "short" });
const rp = (n: number, lang: Language) => formatRupiah(n, lang).replace(/\s/g, " ");
const nightsText = (n: number, lang: Language) => (lang === "id" ? `${n} malam` : n === 1 ? "1 night" : `${n} nights`);

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

export const CARE_LABEL_EN: Record<CareKind, string> = {
  meal: "Meal",
  drink: "Water",
  play: "Play",
  toilet: "Toilet",
  medicine: "Medicine",
  mood: "Mood",
  note: "Note",
  incident: "Incident",
};

export const CARE_PRESET_EN: Record<CareKind, Record<string, string>> = {
  meal: { all: "finished it", most: "nearly finished", little: "ate a little", none: "hasn't eaten yet" },
  drink: { normal: "drank normally", a_lot: "drank a lot", little: "drank little" },
  play: { "10min": "10 minutes", "20min": "20 minutes", "30min": "30 minutes" },
  toilet: { pee: "normal pee", poop: "normal poop", both: "normal pee and poop", loose: "loose stool" },
  medicine: {},
  mood: { happy: "cheerful", calm: "relaxed", quiet: "a bit quiet", stressed: "seemed stressed" },
  note: {},
  incident: {},
};

/** The words for one entry: the one-tap answer, then anything typed. */
export function careText(entry: Pick<CareEntry, "kind" | "preset" | "note">, lang: Language = "id"): string {
  const presets = lang === "id" ? CARE_PRESET_ID : CARE_PRESET_EN;
  const preset = entry.preset ? presets[entry.kind][entry.preset] : "";
  return [preset, entry.note.trim()].filter(Boolean).join(", ");
}

/** https://wa.me/62...?text=...  Without a number it opens WhatsApp's own contact picker instead. */
export function waLink(whatsapp: string, text: string): string {
  return `https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}`;
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] || "";
const greeting = (ownerName: string, lang: Language) => {
  const first = firstName(ownerName);
  return lang === "id" ? (first ? `Halo Kak ${first} 🐾` : "Halo Kak 🐾") : first ? `Hi ${first} 🐾` : "Hi 🐾";
};
const plural = (pets: string) => pets.includes(" & ");

type Who = { hotelName: string; ownerName: string; petName: string; language?: Language };

export function dailyReport(p: Who & { date: ISODate; day: number; entries: CareEntry[] }): string {
  const lang = p.language ?? "id";
  const labels = lang === "id" ? CARE_LABEL_ID : CARE_LABEL_EN;
  const lines = p.entries.map((e) => `${timeOf(e.at, lang)} ${CARE_EMOJI[e.kind]} ${labels[e.kind]}: ${careText(e, lang) || "-"}`);
  const incident = p.entries.some((e) => e.kind === "incident");
  const are = plural(p.petName) ? "are" : "is";
  const closing =
    lang === "id"
      ? incident
        ? "Ada kejadian yang kami catat di atas. Kabari kami kalau ada yang ingin ditanyakan ya."
        : lines.length
          ? `${p.petName} aman dan dalam pengawasan kami. Kalau ada pesan untuk ${p.petName}, kabari ya!`
          : `${p.petName} aman dan dalam pengawasan kami. Belum ada catatan khusus hari ini.`
      : incident
        ? "Something happened today and we noted it above. Let us know if you have any questions."
        : lines.length
          ? `${p.petName} ${are} safe and well looked after. Let us know if you have a message for ${p.petName}!`
          : `${p.petName} ${are} safe and well looked after. Nothing special to note today.`;
  const title =
    lang === "id" ? `Rapor ${p.petName} hari ke-${p.day} (${date(p.date, lang)}) di ${p.hotelName}:` : `${p.petName}'s report, day ${p.day} (${date(p.date, lang)}) at ${p.hotelName}:`;
  return [greeting(p.ownerName, lang), title, ...(lines.length ? ["", ...lines] : []), "", closing].join("\n");
}

export function bookingConfirmation(p: Who & { checkIn: ISODate; checkOut: ISODate; cageName: string; total: number; paid: number }): string {
  const lang = p.language ?? "id";
  const n = nights(p.checkIn, p.checkOut);
  const balance = Math.max(0, p.total - p.paid);
  const range = `${date(p.checkIn, lang)} - ${date(p.checkOut, lang)}`;
  return lang === "id"
    ? [
        greeting(p.ownerName, lang),
        `Booking ${p.petName} di ${p.hotelName} sudah kami catat:`,
        `• Tanggal: ${range} (${nightsText(n, lang)})`,
        `• Kandang: ${p.cageName}`,
        `• Total: ${rp(p.total, lang)}`,
        p.paid > 0 ? `• Sudah dibayar: ${rp(p.paid, lang)}` : "• Belum ada pembayaran",
        balance > 0 ? `• Sisa: ${rp(balance, lang)}` : "• Lunas ✅",
        "",
        "Mohon bawa kartu vaksin dan makanan kesukaan " + p.petName + " saat datang. Terima kasih!",
      ].join("\n")
    : [
        greeting(p.ownerName, lang),
        `We have ${p.petName}'s booking at ${p.hotelName}:`,
        `• Dates: ${range} (${nightsText(n, lang)})`,
        `• Cage: ${p.cageName}`,
        `• Total: ${rp(p.total, lang)}`,
        p.paid > 0 ? `• Paid so far: ${rp(p.paid, lang)}` : "• No payment yet",
        balance > 0 ? `• Balance: ${rp(balance, lang)}` : "• Paid in full ✅",
        "",
        `Please bring the vaccine card and ${p.petName}'s favourite food when you arrive. Thank you!`,
      ].join("\n");
}

export function arrivalNotice(p: Who & { arrival: Arrival }): string {
  const lang = p.language ?? "id";
  const a = p.arrival;
  return lang === "id"
    ? [
        greeting(p.ownerName, lang),
        `${p.petName} sudah check-in di ${p.hotelName}. Kondisi saat tiba:`,
        `• Kesehatan: ${a.healthy ? "tampak sehat" : "perlu perhatian"}`,
        `• Kutu/caplak: ${a.fleaFree ? "tidak terlihat" : "ditemukan"}`,
        ...(a.weightKg !== null ? [`• Berat: ${a.weightKg} kg`] : []),
        ...(a.belongings.trim() ? [`• Bawaan: ${a.belongings.trim()}`] : []),
        ...(a.food.trim() ? [`• Makanan: ${a.food.trim()}`] : []),
        ...(a.notes.trim() ? [`• Catatan: ${a.notes.trim()}`] : []),
        "",
        "Kami akan kirim kabar setiap hari. Terima kasih sudah percaya pada kami 🙏",
      ].join("\n")
    : [
        greeting(p.ownerName, lang),
        `${p.petName} has checked in at ${p.hotelName}. How ${plural(p.petName) ? "they" : "it"} looked on arrival:`,
        `• Health: ${a.healthy ? "looks healthy" : "needs attention"}`,
        `• Fleas/ticks: ${a.fleaFree ? "none seen" : "found"}`,
        ...(a.weightKg !== null ? [`• Weight: ${a.weightKg} kg`] : []),
        ...(a.belongings.trim() ? [`• Belongings: ${a.belongings.trim()}`] : []),
        ...(a.food.trim() ? [`• Food: ${a.food.trim()}`] : []),
        ...(a.notes.trim() ? [`• Notes: ${a.notes.trim()}`] : []),
        "",
        "We will send an update every day. Thank you for trusting us 🙏",
      ].join("\n");
}

export function pickupReminder(p: Who & { checkOut: ISODate; balance: number }): string {
  const lang = p.language ?? "id";
  return lang === "id"
    ? [
        greeting(p.ownerName, lang),
        `Pengingat: ${p.petName} dijadwalkan dijemput ${date(p.checkOut, lang)} dari ${p.hotelName}.`,
        p.balance > 0 ? `Sisa pembayaran: ${rp(p.balance, lang)}.` : "Pembayaran sudah lunas ✅",
        "",
        "Kabari kami jam berapa akan datang ya. Terima kasih!",
      ].join("\n")
    : [
        greeting(p.ownerName, lang),
        `Reminder: ${p.petName} ${plural(p.petName) ? "are" : "is"} due for pickup on ${date(p.checkOut, lang)} from ${p.hotelName}.`,
        p.balance > 0 ? `Balance to pay: ${rp(p.balance, lang)}.` : "Everything is paid ✅",
        "",
        "Let us know what time you will come. Thank you!",
      ].join("\n");
}

export function vaccineReminder(p: Who & { expiry: ISODate | ""; state: "expired" | "soon" | "unknown" }): string {
  const lang = p.language ?? "id";
  if (lang === "id") {
    const status =
      p.state === "expired"
        ? `masa berlaku vaksin ${p.petName} sudah habis (${date(p.expiry as ISODate, lang)})`
        : p.state === "soon"
          ? `vaksin ${p.petName} akan habis masa berlakunya pada ${date(p.expiry as ISODate, lang)}`
          : `kami belum punya data vaksin ${p.petName}`;
    return [greeting(p.ownerName, lang), `Dari ${p.hotelName}: ${status}.`, "Mohon kirimkan foto kartu vaksin terbaru sebelum check-in ya. Terima kasih!"].join("\n");
  }
  const status =
    p.state === "expired"
      ? `${p.petName}'s vaccination has expired (${date(p.expiry as ISODate, lang)})`
      : p.state === "soon"
        ? `${p.petName}'s vaccination expires on ${date(p.expiry as ISODate, lang)}`
        : `we don't have ${p.petName}'s vaccination on record`;
  return [greeting(p.ownerName, lang), `From ${p.hotelName}: ${status}.`, "Please send a photo of the latest vaccine card before check-in. Thank you!"].join("\n");
}

export function paymentReminder(p: Who & { checkOut: ISODate; balance: number; left: boolean }): string {
  const lang = p.language ?? "id";
  return lang === "id"
    ? [
        greeting(p.ownerName, lang),
        p.left
          ? `Dari ${p.hotelName}: masih ada sisa pembayaran untuk penitipan ${p.petName} (${date(p.checkOut, lang)}) sebesar ${rp(p.balance, lang)}.`
          : `Dari ${p.hotelName}: sisa pembayaran penitipan ${p.petName} sebesar ${rp(p.balance, lang)}.`,
        "",
        "Bisa dibayar lewat QRIS, transfer, atau tunai. Kabari kami kalau sudah ya. Terima kasih!",
      ].join("\n")
    : [
        greeting(p.ownerName, lang),
        p.left
          ? `From ${p.hotelName}: there is still a balance of ${rp(p.balance, lang)} for ${p.petName}'s stay (${date(p.checkOut, lang)}).`
          : `From ${p.hotelName}: the balance for ${p.petName}'s stay is ${rp(p.balance, lang)}.`,
        "",
        "You can pay by QRIS, bank transfer or cash. Let us know once it is done. Thank you!",
      ].join("\n");
}

/** The note that goes with an invoice sent on WhatsApp: number, amount, how to pay. The invoice itself is printed or saved as a PDF. */
export function invoiceMessage(invoice: Invoice, balance: number): string {
  const lang = invoice.language;
  const hotel = invoice.seller.name;
  const how = invoice.seller.paymentInstructions.trim();
  return lang === "id"
    ? [
        greeting(invoice.customer.name, lang),
        `Berikut invoice ${invoice.number} dari ${hotel} untuk penitipan ${invoice.petNames} (${date(invoice.stay.checkIn, lang)} - ${date(invoice.stay.checkOut, lang)}).`,
        `Total: ${rp(invoice.total, lang)}`,
        balance > 0 ? `Sisa yang perlu dibayar: ${rp(balance, lang)}` : "Status: lunas ✅",
        ...(balance > 0 && how ? ["", "Cara membayar:", how] : []),
        "",
        "Terima kasih!",
      ].join("\n")
    : [
        greeting(invoice.customer.name, lang),
        `Here is invoice ${invoice.number} from ${hotel} for ${invoice.petNames}'s stay (${date(invoice.stay.checkIn, lang)} - ${date(invoice.stay.checkOut, lang)}).`,
        `Total: ${rp(invoice.total, lang)}`,
        balance > 0 ? `Balance to pay: ${rp(balance, lang)}` : "Status: paid ✅",
        ...(balance > 0 && how ? ["", "How to pay:", how] : []),
        "",
        "Thank you!",
      ].join("\n");
}

/** A receipt sent on WhatsApp: what was received, for what, and what is left. */
export function receiptMessage(p: Who & { receipt: string; amount: number; refund: boolean; method: string; balance: number }): string {
  const lang = p.language ?? "id";
  return lang === "id"
    ? [
        greeting(p.ownerName, lang),
        p.refund
          ? `${p.hotelName} sudah mengembalikan ${rp(p.amount, lang)} untuk penitipan ${p.petName} (${p.method}). No. bukti: ${p.receipt}.`
          : `Terima kasih, ${p.hotelName} sudah menerima ${rp(p.amount, lang)} untuk penitipan ${p.petName} (${p.method}). No. kuitansi: ${p.receipt}.`,
        p.balance > 0 ? `Sisa pembayaran: ${rp(p.balance, lang)}.` : "Status: lunas ✅",
      ].join("\n")
    : [
        greeting(p.ownerName, lang),
        p.refund
          ? `${p.hotelName} has refunded ${rp(p.amount, lang)} for ${p.petName}'s stay (${p.method}). Ref: ${p.receipt}.`
          : `Thank you! ${p.hotelName} received ${rp(p.amount, lang)} for ${p.petName}'s stay (${p.method}). Receipt no. ${p.receipt}.`,
        p.balance > 0 ? `Balance left: ${rp(p.balance, lang)}.` : "Status: paid in full ✅",
      ].join("\n");
}

/** A reminder for an invoice past its due date. */
export function overdueReminder(invoice: Invoice, balance: number): string {
  const lang = invoice.language;
  const how = invoice.seller.paymentInstructions.trim();
  return lang === "id"
    ? [
        greeting(invoice.customer.name, lang),
        `Dari ${invoice.seller.name}: invoice ${invoice.number} untuk penitipan ${invoice.petNames} sudah lewat jatuh tempo (${date(invoice.dueOn ?? invoice.issuedOn, lang)}).`,
        `Sisa yang perlu dibayar: ${rp(balance, lang)}`,
        ...(how ? ["", "Cara membayar:", how] : []),
        "",
        "Kalau sudah dibayar, abaikan pesan ini ya. Terima kasih!",
      ].join("\n")
    : [
        greeting(invoice.customer.name, lang),
        `From ${invoice.seller.name}: invoice ${invoice.number} for ${invoice.petNames}'s stay is past its due date (${date(invoice.dueOn ?? invoice.issuedOn, lang)}).`,
        `Balance to pay: ${rp(balance, lang)}`,
        ...(how ? ["", "How to pay:", how] : []),
        "",
        "If you have already paid, please ignore this. Thank you!",
      ].join("\n");
}
