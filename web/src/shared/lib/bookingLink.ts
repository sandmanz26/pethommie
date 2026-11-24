import { formatWhatsapp, normaliseWhatsapp } from "./phone";

/**
 * A hotel's booking link: everything the public page needs (name, WhatsApp, prices, which pets it takes) packed
 * into the part of the URL after "#", so it works without a server and nothing about it is sent to one. A request
 * made on the page is a WhatsApp message to the hotel; nothing is booked until the hotel confirms.
 */

export type LinkSpecies = "cat" | "dog" | "rabbit" | "other";
export type LinkCard = {
  v: 1;
  hotel: string;
  city: string;
  /** 62xxxxxxxxxx */
  wa: string;
  /** The language requests are written in, for the hotel. */
  lang: "id" | "en";
  /** What the hotel calls its places. */
  units: "cage" | "room" | "space";
  /** The price list, or empty to leave prices to the chat. */
  prices: { label: string; price: number }[];
  species: LinkSpecies[];
  note: string;
  /**
   * The hotel's id on the server, only present once the hotel is synced (a Google account). When set, a request
   * also becomes a booking_requests row (see docs/backend/email-setup.md) that emails the owner, alongside the
   * WhatsApp message every link already sends. A local-only hotel has no id to attach that to, so its links work
   * exactly as before this field existed.
   */
  hid?: string;
};

const SPECIES: LinkSpecies[] = ["cat", "dog", "rabbit", "other"];
const MAX_TEXT = 280;

function toBase64Url(text: string) {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(code: string) {
  const b64 = code.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export const encodeCard = (card: LinkCard) => toBase64Url(JSON.stringify(card));

const text = (x: unknown, max = MAX_TEXT) => (typeof x === "string" ? x.trim().slice(0, max) : null);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The card in a link, or null when the link is cut off, edited by hand or not one of ours. */
export function decodeCard(code: string): LinkCard | null {
  try {
    const raw = JSON.parse(fromBase64Url(code.replace(/^#/, ""))) as Record<string, unknown>;
    if (!raw || raw.v !== 1) return null;
    const hotel = text(raw.hotel, 80);
    const wa = typeof raw.wa === "string" ? normaliseWhatsapp(raw.wa) : null;
    if (!hotel || !wa) return null;
    const prices = Array.isArray(raw.prices)
      ? raw.prices
          .slice(0, 12)
          .map((p: { label?: unknown; price?: unknown }) => ({ label: text(p?.label, 60) ?? "", price: typeof p?.price === "number" && Number.isFinite(p.price) && p.price >= 0 ? Math.round(p.price) : -1 }))
          .filter((p) => p.label && p.price >= 0)
      : [];
    const species = Array.isArray(raw.species) ? SPECIES.filter((s) => (raw.species as unknown[]).includes(s)) : [];
    return {
      v: 1,
      hotel,
      city: text(raw.city, 60) ?? "",
      wa,
      lang: raw.lang === "en" ? "en" : "id",
      units: raw.units === "room" || raw.units === "space" ? raw.units : "cage",
      prices,
      species: species.length ? species : SPECIES,
      note: text(raw.note) ?? "",
      hid: typeof raw.hid === "string" && UUID.test(raw.hid) ? raw.hid : undefined,
    };
  } catch {
    return null;
  }
}

export const linkFor = (origin: string, card: LinkCard) => `${origin}/book#${encodeCard(card)}`;

export type LinkRequest = {
  ownerName: string;
  ownerWa: string;
  petName: string;
  species: LinkSpecies;
  breed: string;
  checkIn: string;
  checkOut: string;
  /** A label from the price list, or empty for "any". */
  preference: string;
  notes: string;
};

const WORDS = {
  id: {
    hello: (hotel: string) => `Halo ${hotel} 🐾`,
    intro: "Saya mau booking penitipan:",
    owner: "Pemilik",
    pet: "Anabul",
    dates: "Tanggal",
    nights: (n: number) => `${n} malam`,
    want: "Pilihan",
    notes: "Catatan",
    species: { cat: "kucing", dog: "anjing", rabbit: "kelinci", other: "lainnya" },
    ask: "Apakah masih ada tempat? Terima kasih!",
    forHotel: "Untuk dicatat di Siomofu:",
  },
  en: {
    hello: (hotel: string) => `Hi ${hotel} 🐾`,
    intro: "I'd like to book a stay:",
    owner: "Owner",
    pet: "Pet",
    dates: "Dates",
    nights: (n: number) => (n === 1 ? "1 night" : `${n} nights`),
    want: "Preference",
    notes: "Notes",
    species: { cat: "cat", dog: "dog", rabbit: "rabbit", other: "other" },
    ask: "Is there room? Thank you!",
    forHotel: "To record it in Siomofu:",
  },
} as const;

const nightsBetween = (a: string, b: string) => {
  const [x, y] = [a, b].map((s) => {
    const [yy, mm, dd] = s.split("-").map(Number);
    return Date.UTC(yy, mm - 1, dd);
  });
  return Math.round((y - x) / 86_400_000);
};

const day = (iso: string, lang: "id" | "en") => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(lang === "id" ? "id-ID" : "en-GB", { weekday: "short", day: "numeric", month: "short" });
};

/** Where the hotel can put the request into Siomofu in one tap: a new booking with the dates and the guest filled in. */
export function prefillUrl(origin: string, r: LinkRequest) {
  const q = new URLSearchParams({ in: r.checkIn, out: r.checkOut, source: "link", owner: r.ownerName.trim(), wa: normaliseWhatsapp(r.ownerWa) ?? "", petName: r.petName.trim(), species: r.species });
  return `${origin}/app/bookings/new?${q}`;
}

/** The WhatsApp message a request sends to the hotel, in the hotel's language. */
export function requestMessage(card: LinkCard, r: LinkRequest, origin: string): string {
  const w = WORDS[card.lang];
  const n = nightsBetween(r.checkIn, r.checkOut);
  const wa = normaliseWhatsapp(r.ownerWa);
  return [
    w.hello(card.hotel),
    w.intro,
    "",
    `${w.owner}: ${r.ownerName.trim()}${wa ? ` (${formatWhatsapp(wa)})` : ""}`,
    `${w.pet}: ${r.petName.trim()} · ${w.species[r.species]}${r.breed.trim() ? ` · ${r.breed.trim()}` : ""}`,
    `${w.dates}: ${day(r.checkIn, card.lang)} → ${day(r.checkOut, card.lang)} (${w.nights(n)})`,
    ...(r.preference ? [`${w.want}: ${r.preference}`] : []),
    ...(r.notes.trim() ? [`${w.notes}: ${r.notes.trim()}`] : []),
    "",
    w.ask,
    "",
    w.forHotel,
    prefillUrl(origin, r),
  ].join("\n");
}

/**
 * Alongside the WhatsApp message, a synced hotel's link (one with `hid`) also saves the request on the server, which
 * emails the owner (see docs/backend/email-setup.md). Best-effort and silent on failure: the WhatsApp message is
 * what the visitor actually sees succeed, so a flaky connection or a project without email set up must never block
 * or show an error for that. A local-only hotel has no `hid`, so this does nothing for it — callers check `card.hid`
 * before bothering to call this at all.
 */
export async function postBookingRequest(card: LinkCard, r: LinkRequest): Promise<void> {
  if (!card.hid) return;
  const wa = normaliseWhatsapp(r.ownerWa);
  if (!wa) return;
  try {
    await fetch("/api/requests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        hotelId: card.hid,
        ownerName: r.ownerName.trim(),
        ownerWa: wa,
        petName: r.petName.trim(),
        species: r.species,
        breed: r.breed.trim(),
        checkIn: r.checkIn,
        checkOut: r.checkOut,
        preference: r.preference,
        notes: r.notes.trim(),
        locale: card.lang,
      }),
    });
  } catch {
    // Silent: see the doc comment above.
  }
}
