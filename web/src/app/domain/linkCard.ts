import type { LinkCard, LinkSpecies } from "@/shared/lib/bookingLink";
import { isShared, SIZE_ORDER } from "./logic";
import type { HotelData, Language } from "./types";

/** What the owner chooses to show on the booking link. */
export type LinkOptions = { lang: Language; showPrices: boolean; species: LinkSpecies[]; note: string };

export const defaultLinkOptions = (data: Pick<HotelData, "settings">): LinkOptions => ({ lang: data.settings.invoiceLanguage, showPrices: true, species: ["cat", "dog"], note: "" });

const WORDS = {
  id: { sizes: { S: "kecil", M: "sedang", L: "besar" }, units: { cage: "Kandang", room: "Kamar", space: "Tempat" }, perPet: "per anabul", from: "mulai", pool: "Per anabul per malam" },
  en: { sizes: { S: "small", M: "medium", L: "large" }, units: { cage: "Cage", room: "Room", space: "Space" }, perPet: "per pet", from: "from", pool: "Per pet per night" },
} as const;

/** The hotel's price list as the link shows it: one line per size of private unit, one per shared room. */
export function priceList(data: Pick<HotelData, "cages" | "settings">, lang: Language): LinkCard["prices"] {
  const w = WORDS[lang];
  // No cages or rooms: one price per pet, with no unit to name.
  if (data.settings.unitTerm === "none") return data.cages.filter((c) => !c.archived).slice(0, 1).map((c) => ({ label: w.pool, price: c.pricePerNight }));
  const term = data.settings.unitTerm;
  const own = data.cages.filter((c) => !isShared(c) && !c.archived);
  const bySize = SIZE_ORDER.flatMap((size) => {
    const of = own.filter((c) => c.size === size);
    if (!of.length) return [];
    const low = Math.min(...of.map((c) => c.pricePerNight));
    const mixed = of.some((c) => c.pricePerNight !== low);
    return [{ label: `${w.units[term]} ${w.sizes[size]}${mixed ? ` (${w.from})` : ""}`, price: low }];
  });
  const rooms = data.cages.filter((c) => isShared(c) && !c.archived).map((c) => ({ label: `${c.name} (${w.perPet})`, price: c.pricePerNight }));
  return [...bySize, ...rooms];
}

/** The card a link carries, or null while the hotel has no WhatsApp number for requests to go to. */
export function cardFor(data: HotelData, o: LinkOptions): LinkCard | null {
  if (!data.hotel?.whatsapp) return null;
  return {
    v: 1,
    hotel: data.hotel.name,
    city: data.hotel.city,
    wa: data.hotel.whatsapp,
    lang: o.lang,
    // The link format knows cages, rooms and spaces; a hotel without units reads as spaces there.
    units: data.settings.unitTerm === "none" ? "space" : data.settings.unitTerm,
    prices: o.showPrices ? priceList(data, o.lang) : [],
    species: o.species,
    note: o.note.trim(),
  };
}
