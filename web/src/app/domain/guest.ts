import { normaliseWhatsapp } from "@/shared/lib/phone";
import type { HotelData, Owner, Species } from "./types";

/** Who a booking is for: an owner on record or a new one, and which of their pets (on record or new) are staying. */
export type GuestDraft = {
  ownerId: string | null;
  /** Set while a new owner is being entered. */
  newOwner: { name: string; whatsapp: string } | null;
  /** The owner's pets on record that are staying; the first is the one the stay is booked for. */
  petIds: string[];
  /** A pet not on record yet, staying too. */
  newPet: { name: string; species: Species } | null;
};

export const emptyGuest = (): GuestDraft => ({ ownerId: null, newOwner: null, petIds: [], newPet: null });

export type GuestErrors = { owner?: string; ownerName?: string; whatsapp?: string; pets?: string; petName?: string };

/** The owner a typed WhatsApp number already belongs to, if any. */
export function ownerWithNumber(data: HotelData, whatsapp: string): Owner | undefined {
  const n = normaliseWhatsapp(whatsapp);
  return n ? data.owners.find((o) => o.whatsapp === n) : undefined;
}

/** What is missing or wrong in a guest, before the booking can be saved. */
export function guestErrors(data: HotelData, g: GuestDraft, words: { owner: string; ownerName: string; whatsapp: string; taken: (name: string) => string; pets: string; petName: string }): GuestErrors {
  const err: GuestErrors = {};
  if (!g.ownerId && !g.newOwner) err.owner = words.owner;
  if (g.newOwner) {
    if (!g.newOwner.name.trim()) err.ownerName = words.ownerName;
    if (g.newOwner.whatsapp.trim() && !normaliseWhatsapp(g.newOwner.whatsapp)) err.whatsapp = words.whatsapp;
    const same = ownerWithNumber(data, g.newOwner.whatsapp);
    if (same) err.whatsapp = words.taken(same.name);
  }
  if ((g.ownerId || g.newOwner) && g.petIds.length === 0 && !g.newPet) err.pets = words.pets;
  if (g.newPet && !g.newPet.name.trim()) err.petName = words.petName;
  return err;
}

/**
 * The guest of a request from the booking link: the owner on record with that number (and their pet of that name,
 * if they have one), or a new owner and pet filled in from the request.
 */
export function guestFromRequest(data: HotelData, r: { owner: string; wa: string; petName: string; species: string }): GuestDraft {
  const species = (["cat", "dog", "rabbit", "other"] as Species[]).find((x) => x === r.species) ?? "cat";
  const known = ownerWithNumber(data, r.wa);
  const name = r.petName.trim();
  if (known) {
    const pet = data.pets.find((p) => p.ownerId === known.id && p.name.toLowerCase() === name.toLowerCase());
    return { ownerId: known.id, newOwner: null, petIds: pet ? [pet.id] : [], newPet: pet || !name ? null : { name, species } };
  }
  return { ownerId: null, newOwner: { name: r.owner.trim(), whatsapp: r.wa }, petIds: [], newPet: { name, species } };
}
