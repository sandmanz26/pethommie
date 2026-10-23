import { addDays, bookingTotal, cageIsFree, canGoUnitless, newId, placesFor } from "@/app/domain/logic";
import { holdAfterConfirm, holdForNew, isValidDepositPercent } from "@/app/domain/policy";
import { bookingIssues, canTransition, cageCanBeRemoved, editIssues, petHasHistory, type BookingIssue, type BookingPatch } from "@/app/domain/bookingRules";
import { careIssues, type CareIssue } from "@/app/domain/careLog";
import { isValidAmount, paidAmount, type PaymentIssue } from "@/app/domain/payments";
import { chargeIssues, type ChargeIssue } from "@/app/domain/charges";
import { buildInvoice, type InvoiceIssue } from "@/app/domain/invoices";
import { expenseIssues, type ExpenseIssue } from "@/app/domain/finance";
import type { Arrival, Booking, BookingStatus, CancelReason, CareEntry, Cage, Charge, Expense, Hotel, HotelData, HotelSettings, ISODate, Invoice, Language, Owner, Payment, PaymentMethod, Pet } from "@/app/domain/types";

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

/**
 * Takes a unit out of use. Refused ("busy") while it has a pending or current stay. A unit that ever had a stay is
 * archived, so those stays keep their unit (and their price and history); one that never did is removed.
 */
export function removeCage(s: HotelData, id: string): Outcome<"removed" | "archived" | "busy" | "unknown"> {
  if (!s.cages.some((c) => c.id === id)) return { state: s, result: "unknown" };
  if (!cageCanBeRemoved(s, id)) return { state: s, result: "busy" };
  if (s.bookings.some((b) => b.cageId === id)) return { state: { ...s, cages: s.cages.map((c) => (c.id === id ? { ...c, archived: true } : c)) }, result: "archived" };
  return { state: { ...s, cages: s.cages.filter((c) => c.id !== id) }, result: "removed" };
}

/** Puts an archived unit back in use. */
export const restoreCage = (s: HotelData, id: string): HotelData => ({ ...s, cages: s.cages.map((c) => (c.id === id ? { ...c, archived: false } : c)) });

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

/** Removes the pet, its stays, and everything recorded against them; refused (false) for a pet with history. */
export function removePet(s: HotelData, id: string): Outcome<boolean> {
  if (!s.pets.some((p) => p.id === id) || petHasHistory(s, id)) return { state: s, result: false };
  return { state: removePetRecords(s, id), result: true };
}

function removePetRecords(s: HotelData, id: string): HotelData {
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

/** What the stay costs and what has come in, for the deposit rules. */
function moneyOf(s: HotelData, b: Booking) {
  return { paid: paidAmount(b), total: bookingTotal(b, s.cages.find((c) => c.id === b.cageId)) };
}

/**
 * Saves the booking unless it breaks a rule; the issues come back so the caller can say why. A new booking is taken
 * the hotel's way (see PayPolicy): confirmed, waiting for its deposit, or a request. Its unit must be free either
 * way, so a request is only made for a slot that is open when it is asked for.
 */
export function upsertBooking(s: HotelData, booking: Booking): Outcome<BookingIssue[]> {
  const existing = s.bookings.find((b) => b.id === booking.id);
  // What a stay waits for is set here and by the actions that change it (confirm, pay, cancel), never by the caller.
  const { hold: _given, ...plain } = booking;
  const hold = existing ? existing.hold : holdForNew(s.settings.payPolicy, moneyOf(s, plain).paid, moneyOf(s, plain).total);
  const issues = bookingIssues(s, existing ? { ...plain, ...(hold ? { hold } : {}) } : plain);
  if (issues.length) return { state: s, result: issues };
  const saved: Booking = hold ? { ...plain, hold } : plain;
  return { state: { ...s, bookings: upsert(s.bookings, saved) }, result: [] };
}

export type ConfirmIssue = "status" | "full";

/**
 * The hotel confirms a request: the slot is checked again (it holds nothing until now) and taken. Then it waits for
 * the deposit, if the hotel asks for one and it isn't paid, or is simply confirmed.
 */
export function confirmBooking(s: HotelData, id: string): Outcome<ConfirmIssue[]> {
  const current = s.bookings.find((b) => b.id === id);
  if (!current || current.status !== "booked" || current.hold !== "request") return { state: s, result: ["status"] };
  const unit = s.cages.find((c) => c.id === current.cageId);
  if (!cageIsFree(s, current.cageId, current.checkIn, current.checkOut, current.id, placesFor(current, unit))) return { state: s, result: ["full"] };
  const { paid, total } = moneyOf(s, current);
  const hold = holdAfterConfirm(s.settings.payPolicy, paid, total);
  return { state: withBooking(s, id, ({ hold: _h, ...b }) => (hold ? { ...b, hold } : b)), result: [] };
}

/** Moves a stay along its life cycle; refuses (result false) any other jump. Cancelling goes through cancelBooking. */
export function changeBookingStatus(s: HotelData, id: string, status: BookingStatus): Outcome<boolean> {
  const current = s.bookings.find((b) => b.id === id);
  if (!current || status === "cancelled" || !canTransition(current.status, status)) return { state: s, result: false };
  return { state: { ...s, bookings: s.bookings.map((b) => (b.id === id ? { ...b, status } : b)) }, result: true };
}

const withBooking = (s: HotelData, id: string, change: (b: Booking) => Booking): HotelData => ({
  ...s,
  bookings: s.bookings.map((b) => (b.id === id ? change(b) : b)),
});

export type CancelRequest = {
  reason: CancelReason;
  /** Money given back now, from what was paid; 0 keeps it all (a cancellation fee, or a no-show's deposit). */
  refund: number;
  method: PaymentMethod;
  /** Today, for voiding the stay's invoice; and the time the refund was given. */
  on: ISODate;
  at: string;
};
export type CancelIssue = "status" | "refund";

/**
 * Calls a booked stay off, saying why. Gives back what the hotel decides to give back (never more than was paid),
 * and voids the stay's invoice, so it no longer counts as sold.
 */
export function cancelBooking(s: HotelData, id: string, r: CancelRequest): Outcome<CancelIssue[]> {
  const current = s.bookings.find((b) => b.id === id);
  if (!current || !canTransition(current.status, "cancelled")) return { state: s, result: ["status"] };
  if (!Number.isInteger(r.refund) || r.refund < 0 || r.refund > paidAmount(current)) return { state: s, result: ["refund"] };
  const refund: Payment[] = r.refund > 0 ? [{ id: newId(), at: r.at, amount: r.refund, method: r.method, kind: "refund", reference: "", note: "" }] : [];
  // A cancelled stay waits for nothing.
  const next = withBooking(s, id, ({ hold: _h, ...b }) => ({ ...b, status: "cancelled", cancelReason: r.reason, payments: [...b.payments, ...refund] }));
  return {
    state: { ...next, invoices: next.invoices.map((i) => (i.bookingId === id && i.status === "issued" ? { ...i, status: "void", voidedOn: r.on } : i)) },
    result: [],
  };
}

export type CheckOutIssue = "status" | "cage_taken";

/**
 * The pet goes home. With `endOn`, the stay is re-dated to the day it really ended: earlier (picked up early, so
 * fewer nights) or later (picked up late, so more nights, if the unit is free for them). Without it the booked
 * dates stand.
 */
export function checkOutBooking(s: HotelData, id: string, endOn?: ISODate): Outcome<CheckOutIssue[]> {
  const current = s.bookings.find((b) => b.id === id);
  if (!current || !canTransition(current.status, "checked_out")) return { state: s, result: ["status"] };
  let checkOut = current.checkOut;
  if (endOn && endOn !== current.checkOut) {
    checkOut = endOn > current.checkIn ? endOn : addDays(current.checkIn, 1);
    const unit = s.cages.find((c) => c.id === current.cageId);
    if (checkOut > current.checkOut && !cageIsFree(s, current.cageId, current.checkOut, checkOut, current.id, placesFor(current, unit))) return { state: s, result: ["cage_taken"] };
  }
  return { state: withBooking(s, id, (b) => ({ ...b, status: "checked_out", checkOut })), result: [] };
}

/** Changes dates, cage or notes of a stay that exists, under the same rules as a new booking. */
export function editBooking(s: HotelData, id: string, patch: BookingPatch): Outcome<BookingIssue[]> {
  const current = s.bookings.find((b) => b.id === id);
  if (!current) return { state: s, result: ["locked"] };
  const issues = editIssues(s, current, patch);
  if (issues.length) return { state: s, result: issues };
  // Moving to another unit takes that unit's rate; otherwise the agreed rate stays.
  const moved = patch.cageId !== undefined && patch.cageId !== current.cageId;
  const rate = moved ? (s.cages.find((c) => c.id === patch.cageId)?.pricePerNight ?? current.rate) : current.rate;
  return { state: withBooking(s, id, (b) => ({ ...b, ...patch, rate })), result: [] };
}

/**
 * Checks a booked pet in, keeping the arrival record if there is one. Refuses anything but booked → checked in, and a
 * stay that isn't confirmed yet (a request, or one still waiting for its deposit).
 */
export function checkInBooking(s: HotelData, id: string, arrival: Arrival | null): Outcome<boolean> {
  const current = s.bookings.find((b) => b.id === id);
  if (!current || current.hold || !canTransition(current.status, "checked_in")) return { state: s, result: false };
  return { state: withBooking(s, id, (b) => ({ ...b, status: "checked_in", arrival })), result: true };
}

/**
 * Records money received or given back. Not for a cancelled stay; the amount must be a whole number above zero, and a
 * refund can't be more than the stay has kept.
 */
export function recordPayment(s: HotelData, bookingId: string, payment: Omit<Payment, "id">): Outcome<PaymentIssue[]> {
  const booking = s.bookings.find((b) => b.id === bookingId);
  const issues: PaymentIssue[] = [];
  if (!booking) issues.push("booking");
  // A cancelled stay takes no more money in, but can still give money back.
  else if (booking.status === "cancelled" && payment.kind !== "refund") issues.push("cancelled");
  if (!isValidAmount(payment.amount)) issues.push("amount");
  else if (booking && payment.kind === "refund" && payment.amount > paidAmount(booking)) issues.push("refund");
  if (issues.length) return { state: s, result: issues };
  const next = withBooking(s, bookingId, (b) => ({ ...b, payments: [...b.payments, { ...payment, id: newId() }] }));
  // The deposit is in: the stay is confirmed.
  const after = next.bookings.find((b) => b.id === bookingId)!;
  if (after.hold === "deposit") {
    const { paid, total } = moneyOf(next, after);
    if (!holdAfterConfirm({ ...next.settings.payPolicy, mode: "deposit_first" }, paid, total)) return { state: withBooking(next, bookingId, ({ hold: _h, ...b }) => b), result: [] };
  }
  return { state: next, result: [] };
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
/** layout: dropping cages and rooms while the hotel has more than one unit in use (see canGoUnitless). */
/** deposit: the deposit percent isn't a whole number from 0 to 100. */
export type SettingsIssue = "ppn" | "prefix" | "layout" | "deposit";

export function settingsIssues(settings: HotelSettings): SettingsIssue[] {
  const issues: SettingsIssue[] = [];
  const { ppnPercent } = settings.tax;
  if (!Number.isFinite(ppnPercent) || ppnPercent < 0 || ppnPercent > 100) issues.push("ppn");
  if (!settings.invoicePrefix.replace(/[^A-Za-z0-9]/g, "")) issues.push("prefix");
  if (!isValidDepositPercent(settings.payPolicy.depositPercent)) issues.push("deposit");
  return issues;
}

export function saveSettings(s: HotelData, settings: HotelSettings): Outcome<SettingsIssue[]> {
  const issues = settingsIssues(settings);
  if (settings.unitTerm === "none" && s.settings.unitTerm !== "none" && !canGoUnitless(s)) issues.push("layout");
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

/** Saves an expense (new, or an edit of one with the same id), unless its amount, date or category is wrong. */
export function saveExpense(s: HotelData, expense: Expense): Outcome<ExpenseIssue[]> {
  const issues = expenseIssues(expense);
  if (issues.length) return { state: s, result: issues };
  const clean = { ...expense, vendor: expense.vendor.trim(), note: expense.note.trim() };
  return { state: { ...s, expenses: upsert(s.expenses, clean) }, result: [] };
}

/** Adds several expenses at once (the recurring ones of a month); any that is wrong is left out. */
export function addExpenses(s: HotelData, list: Omit<Expense, "id">[]): Outcome<number> {
  const ok = list.filter((e) => expenseIssues(e).length === 0).map((e) => ({ ...e, id: newId() }));
  return { state: { ...s, expenses: [...s.expenses, ...ok] }, result: ok.length };
}

export const removeExpense = (s: HotelData, id: string): HotelData => ({ ...s, expenses: s.expenses.filter((e) => e.id !== id) });
