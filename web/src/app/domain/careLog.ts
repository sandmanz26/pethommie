import type { Booking, CareEntry, CareKind, HotelData, ISODate } from "./types";
import { dayOf } from "./logic";

/** The daily care log: what the staff did for a pet that is staying, with the time. */

export const CARE_KINDS: readonly CareKind[] = ["meal", "drink", "play", "toilet", "medicine", "mood", "note", "incident"];

/**
 * One-tap answers per kind. The keys are stored; what they say is looked up where it is shown (the app's
 * language on screen, Indonesian in messages to owners).
 */
export const CARE_PRESETS: Record<CareKind, readonly string[]> = {
  meal: ["all", "most", "little", "none"],
  drink: ["normal", "a_lot", "little"],
  play: ["10min", "20min", "30min"],
  toilet: ["pee", "poop", "both", "loose"],
  medicine: [],
  mood: ["happy", "calm", "quiet", "stressed"],
  note: [],
  incident: [],
};

/** Kinds that mean nothing without words. */
export const NEEDS_NOTE: readonly CareKind[] = ["medicine", "note", "incident"];

export type CareIssue = "booking" | "not_staying" | "time" | "note_required" | "preset";

export function careIssues(data: HotelData, entry: Omit<CareEntry, "id">): CareIssue[] {
  const issues: CareIssue[] = [];
  const booking = data.bookings.find((b) => b.id === entry.bookingId);
  if (!booking) issues.push("booking");
  else if (booking.status !== "checked_in") issues.push("not_staying");
  if (Number.isNaN(Date.parse(entry.at))) issues.push("time");
  if (entry.preset !== null && !CARE_PRESETS[entry.kind].includes(entry.preset)) issues.push("preset");
  if (NEEDS_NOTE.includes(entry.kind) && !entry.note.trim()) issues.push("note_required");
  if (!entry.preset && !entry.note.trim() && !NEEDS_NOTE.includes(entry.kind)) issues.push("note_required");
  return issues;
}

/** One pet's entries for one day, earliest first. */
export function entriesOn(data: HotelData, bookingId: string, date: ISODate): CareEntry[] {
  return data.careLog
    .filter((e) => e.bookingId === bookingId && dayOf(e.at) === date)
    .sort((a, b) => a.at.localeCompare(b.at));
}

export const hasIncident = (entries: CareEntry[]) => entries.some((e) => e.kind === "incident");

export function reportWasSent(data: HotelData, bookingId: string, date: ISODate) {
  return data.reportsSent.some((r) => r.bookingId === bookingId && r.date === date);
}

/** Pets staying today and what is still to do for each: a report not yet sent, nothing logged yet. */
export function stayingToday(data: HotelData, today: ISODate) {
  return data.bookings
    .filter((b): b is Booking => b.status === "checked_in")
    .map((booking) => {
      const entries = entriesOn(data, booking.id, today);
      return { booking, entries, reportSent: reportWasSent(data, booking.id, today), incident: hasIncident(entries) };
    });
}
