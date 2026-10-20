import { newId } from "@/app/domain/logic";
import { bookingIssues, canTransition, cageCanBeRemoved, editIssues, type BookingIssue, type BookingPatch } from "@/app/domain/bookingRules";
import { careIssues, type CareIssue } from "@/app/domain/careLog";
import { isValidAmount, type PaymentIssue } from "@/app/domain/payments";
import { chargeIssues, type ChargeIssue } from "@/app/domain/charges";
import { buildInvoice, type InvoiceIssue } from "@/app/domain/invoices";
import type { Arrival, Booking, BookingStatus, CareEntry, Cage, Charge, Hotel, HotelData, HotelSettings, ISODate, Invoice, Language, Owner, Payment, Pet } from "@/app/domain/types";

/**
 * Every change to the hotel's data, as a pure function: (state, input) → new state.
 * Rules are enforced here, not only in the forms, so nothing can put the data in a bad state.
 * Functions that can refuse return `{ state, result }` and hand back the same `state` when they do.
 */
export type Outcome<R> = { state: HotelData; result: R };

function upsert<T extends { id: string }>(list: T[], item: T) {
  return list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];
}

export const setHotel = (s: HotelData, hotel: Hotel): HotelData => ({ ...s, hotel });

export const setCages = (s: HotelData, cages: Cage[]): HotelData => ({ ...s, cages });

export const upsertCage = (s: HotelData, cage: Cage): HotelData => ({ ...s, cages: upsert(s.cages, cage) });

/** Refuses (result false) while the cage has a pending or current stay. */
export function removeCage(s: HotelData, id: string): Outcome<boolean> {
  if (!s.cages.some((c) => c.id === id) || !cageCanBeRemoved(s, id)) return { state: s, result: false };
  return { state: { ...s, cages: s.cages.filter((c) => c.id !== id) }, result: true };
}

/** Saves an owner, reusing an existing one with the same WhatsApp number. Returns the owner's id. */
export type OwnerInput = Omit<Owner, "id" | "language"> & { id?: string; language?: Language };

export function upsertOwner(s: HotelData, owner: OwnerInput): Outcome<string> {
  const existing = owner.whatsapp ? s.owners.find((o) => o.whatsapp === owner.whatsapp && o.id !== owner.id) : undefined;
  const id = owner.id ?? existing?.id ?? newId();
  // Saving an owner again keeps the language they were set to, unless a new one is given.
  const language = owner.language ?? s.owners.find((o) => o.id === id)?.language ?? "id";
  return { state: { ...s, owners: upsert(s.owners, { ...owner, id, language }) }, result: id };
}

export const upsertPet = (s: HotelData, pet: Pet): HotelData => ({ ...s, pets: upsert(s.pets, pet) });

/** Removes the pet, its stays, and everything recorded against them. */
export function removePet(s: HotelData, id: string): HotelData {
  const gone = new Set(s.bookings.filter((b) => b.petId === id).map((b) => b.id));
  return {
    ...s,
    pets: s.pets.filter((p) => p.id !== id),
    // A pet that only shared a cage leaves the stay; the stay carries on for the others.
    bookings: s.bookings.filter((b) => b.petId !== id).map((b) => (b.companionIds.includes(id) ? { ...b, companionIds: b.companionIds.filter((c) => c !== id) } : b)),
    careLog: s.careLog.filter((e) => !gone.has(e.bookingId)),
    reportsSent: s.reportsSent.filter((r) => !gone.has(r.bookingId)),
  };
}

/** Saves the booking unless it breaks a rule; the issues come back so the caller can say why. */
export function upsertBooking(s: HotelData, booking: Booking): Outcome<BookingIssue[]> {
  const issues = bookingIssues(s, booking);
  if (issues.length) return { state: s, result: issues };
  return { state: { ...s, bookings: upsert(s.bookings, booking) }, result: [] };
}

/** Moves a stay along its life cycle; refuses (result false) any other jump. */
export function changeBookingStatus(s: HotelData, id: string, status: BookingStatus): Outcome<boolean> {
  const current = s.bookings.find((b) => b.id === id);
  if (!current || !canTransition(current.status, status)) return { state: s, result: false };
  return { state: { ...s, bookings: s.bookings.map((b) => (b.id === id ? { ...b, status } : b)) }, result: true };
}

const withBooking = (s: HotelData, id: string, change: (b: Booking) => Booking): HotelData => ({
  ...s,
  bookings: s.bookings.map((b) => (b.id === id ? change(b) : b)),
});

/** Changes dates, cage or notes of a stay that exists, under the same rules as a new booking. */
export function editBooking(s: HotelData, id: string, patch: BookingPatch): Outcome<BookingIssue[]> {
  const current = s.bookings.find((b) => b.id === id);
  if (!current) return { state: s, result: ["locked"] };
  const issues = editIssues(s, current, patch);
  if (issues.length) return { state: s, result: issues };
  return { state: withBooking(s, id, (b) => ({ ...b, ...patch })), result: [] };
}

/** Checks a booked pet in, keeping the arrival record if there is one. Refuses anything but booked → checked in. */
export function checkInBooking(s: HotelData, id: string, arrival: Arrival | null): Outcome<boolean> {
  const current = s.bookings.find((b) => b.id === id);
  if (!current || !canTransition(current.status, "checked_in")) return { state: s, result: false };
  return { state: withBooking(s, id, (b) => ({ ...b, status: "checked_in", arrival })), result: true };
}

/** Records money received. Not for a cancelled stay, and the amount must be a whole number above zero. */
export function recordPayment(s: HotelData, bookingId: string, payment: Omit<Payment, "id">): Outcome<PaymentIssue[]> {
  const booking = s.bookings.find((b) => b.id === bookingId);
  const issues: PaymentIssue[] = [];
  if (!booking) issues.push("booking");
  else if (booking.status === "cancelled") issues.push("cancelled");
  if (!isValidAmount(payment.amount)) issues.push("amount");
  if (issues.length) return { state: s, result: issues };
  return { state: withBooking(s, bookingId, (b) => ({ ...b, payments: [...b.payments, { ...payment, id: newId() }] })), result: [] };
}

/** Takes back a payment that was entered by mistake. */
export const removePayment = (s: HotelData, bookingId: string, paymentId: string): HotelData =>
  withBooking(s, bookingId, (b) => ({ ...b, payments: b.payments.filter((p) => p.id !== paymentId) }));

/** Adds a line to the care log. Only for a pet that is staying, and it can't be empty. */
export function recordCare(s: HotelData, entry: Omit<CareEntry, "id">): Outcome<CareIssue[]> {
  const issues = careIssues(s, entry);
  if (issues.length) return { state: s, result: issues };
  return { state: { ...s, careLog: [...s.careLog, { ...entry, note: entry.note.trim(), id: newId() }] }, result: [] };
}

export const removeCare = (s: HotelData, id: string): HotelData => ({ ...s, careLog: s.careLog.filter((e) => e.id !== id) });

/** Notes that the day's report went to the owner. Once per stay and day; sending again just updates the time. */
export function markReportSent(s: HotelData, bookingId: string, date: ISODate, at: string): HotelData {
  const others = s.reportsSent.filter((r) => !(r.bookingId === bookingId && r.date === date));
  return { ...s, reportsSent: [...others, { bookingId, date, at }] };
}

/** Adds a charge or a discount to a stay. A cancelled stay has no price to change. */
export function addCharge(s: HotelData, bookingId: string, charge: Omit<Charge, "id">): Outcome<ChargeIssue[]> {
  const booking = s.bookings.find((b) => b.id === bookingId);
  const issues: ChargeIssue[] = chargeIssues(charge);
  if (!booking) issues.unshift("booking");
  else if (booking.status === "cancelled") issues.unshift("locked");
  if (issues.length) return { state: s, result: issues };
  return { state: withBooking(s, bookingId, (b) => ({ ...b, charges: [...b.charges, { ...charge, label: charge.label.trim(), id: newId() }] })), result: [] };
}

export const removeCharge = (s: HotelData, bookingId: string, chargeId: string): HotelData =>
  withBooking(s, bookingId, (b) => ({ ...b, charges: b.charges.filter((c) => c.id !== chargeId) }));

/** What can be wrong with the hotel's business and tax settings. */
export type SettingsIssue = "ppn" | "prefix";

export function settingsIssues(settings: HotelSettings): SettingsIssue[] {
  const issues: SettingsIssue[] = [];
  const { ppnPercent } = settings.tax;
  if (!Number.isFinite(ppnPercent) || ppnPercent < 0 || ppnPercent > 100) issues.push("ppn");
  if (!settings.invoicePrefix.replace(/[^A-Za-z0-9]/g, "")) issues.push("prefix");
  return issues;
}

export function saveSettings(s: HotelData, settings: HotelSettings): Outcome<SettingsIssue[]> {
  const issues = settingsIssues(settings);
  if (issues.length) return { state: s, result: issues };
  const clean: HotelSettings = {
    ...settings,
    legalName: settings.legalName.trim(),
    address: settings.address.trim(),
    npwp: settings.npwp.trim(),
    invoicePrefix: settings.invoicePrefix.replace(/[^A-Za-z0-9]/g, "").toUpperCase(),
    paymentInstructions: settings.paymentInstructions.trim(),
  };
  return { state: { ...s, settings: clean }, result: [] };
}

/** Makes the invoice for a stay and keeps it. Refused for a cancelled stay, or one that already has a live invoice. */
export function issueInvoice(s: HotelData, bookingId: string, request: { issuedOn: ISODate; language?: Language; dueOn?: ISODate | null }): Outcome<InvoiceIssue[]> {
  const made = buildInvoice(s, bookingId, { ...request, id: newId() });
  if ("issues" in made) return { state: s, result: made.issues };
  return { state: { ...s, invoices: [...s.invoices, made.invoice] }, result: [] };
}

/** Cancels an invoice. It stays in the list with its number, marked void, so numbers have no gaps. */
export function voidInvoice(s: HotelData, invoiceId: string, on: ISODate): Outcome<boolean> {
  const invoice = s.invoices.find((i) => i.id === invoiceId);
  if (!invoice || invoice.status !== "issued") return { state: s, result: false };
  const next: Invoice = { ...invoice, status: "void", voidedOn: on };
  return { state: { ...s, invoices: s.invoices.map((i) => (i.id === invoiceId ? next : i)) }, result: true };
}
