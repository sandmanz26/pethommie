import { addDays, isShared, nightlyRate, nights, stayPetIds } from "./logic";
import { paidAmount } from "./payments";
import type { Booking, HotelData, ISODate, Invoice, InvoiceLine, Language, TaxProfile } from "./types";

/**
 * Invoices: numbered, tax worked out, copied whole from the stay at the moment they are made. Pure functions,
 * so the same numbers come out wherever they are computed (screen, print, test, later the server).
 */

export type InvoiceTotals = { subtotal: number; taxPercent: number; taxAmount: number; total: number };

/** Whole rupiah. */
const rupiah = (n: number) => Math.round(n);

/**
 * What a list of lines comes to, with tax. A hotel that is not a VAT payer (PKP) charges no tax. One that is either
 * has tax inside its prices (the total is the lines, the tax is the part of it) or on top of them.
 */
export function invoiceTotals(lines: Pick<InvoiceLine, "amount">[], tax: Pick<TaxProfile, "pkp" | "ppnPercent" | "pricesIncludeTax">): InvoiceTotals {
  const sum = Math.max(0, lines.reduce((s, l) => s + l.amount, 0));
  if (!tax.pkp || tax.ppnPercent <= 0) return { subtotal: sum, taxPercent: 0, taxAmount: 0, total: sum };
  if (tax.pricesIncludeTax) {
    const subtotal = rupiah(sum / (1 + tax.ppnPercent / 100));
    return { subtotal, taxPercent: tax.ppnPercent, taxAmount: sum - subtotal, total: sum };
  }
  const taxAmount = rupiah((sum * tax.ppnPercent) / 100);
  return { subtotal: sum, taxPercent: tax.ppnPercent, taxAmount, total: sum + taxAmount };
}

const PREFIX_SAFE = /[^A-Za-z0-9]/g;

/** "INV-2026-0001". The next number for a year goes one past the highest used, voided ones included: a number is never reused. */
export function nextInvoiceNumber(invoices: Invoice[], prefix: string, year: number): string {
  const p = prefix.replace(PREFIX_SAFE, "").toUpperCase() || "INV";
  const re = new RegExp(`^${p}-${year}-(\\d+)$`);
  const highest = invoices.reduce((max, i) => {
    const m = re.exec(i.number);
    return m ? Math.max(max, Number(m[1])) : max;
  }, 0);
  return `${p}-${year}-${String(highest + 1).padStart(4, "0")}`;
}

export type InvoiceIssue = "booking" | "cancelled" | "exists" | "cage" | "hotel";

export type InvoiceRequest = { id: string; issuedOn: ISODate; language?: Language; dueOn?: ISODate | null };

const WORDS = {
  id: { boarding: (pets: string, cage: string) => `Penitipan ${pets} · kandang ${cage}` },
  en: { boarding: (pets: string, cage: string) => `Boarding ${pets} · cage ${cage}` },
} as const;

/** The lines of a stay's invoice: the nights, then each add-on and discount as typed. */
export function invoiceLines(data: HotelData, booking: Booking, language: Language): InvoiceLine[] {
  const cage = data.cages.find((c) => c.id === booking.cageId);
  // In a shared room each pet pays the nightly rate, so the quantity is pet-nights.
  const n = Math.max(0, nights(booking.checkIn, booking.checkOut)) * (isShared(cage) ? stayPetIds(booking).length : 1);
  const names = petNames(data, booking);
  return [
    { label: WORDS[language].boarding(names, cage?.name ?? "-"), quantity: n, unitPrice: nightlyRate(booking, cage), amount: n * nightlyRate(booking, cage) },
    ...booking.charges.map((c) => ({ label: c.label, quantity: 1, unitPrice: c.amount, amount: c.amount })),
  ];
}

export function petNames(data: HotelData, booking: Pick<Booking, "petId" | "companionIds">): string {
  return stayPetIds(booking)
    .map((id) => data.pets.find((p) => p.id === id)?.name)
    .filter(Boolean)
    .join(" & ");
}

/** The invoice for a stay as of now, or what stops it from being made. */
export function buildInvoice(data: HotelData, bookingId: string, req: InvoiceRequest): { invoice: Invoice } | { issues: InvoiceIssue[] } {
  const booking = data.bookings.find((b) => b.id === bookingId);
  if (!booking) return { issues: ["booking"] };
  if (!data.hotel) return { issues: ["hotel"] };
  if (booking.status === "cancelled") return { issues: ["cancelled"] };
  if (data.invoices.some((i) => i.bookingId === bookingId && i.status === "issued")) return { issues: ["exists"] };
  const cage = data.cages.find((c) => c.id === booking.cageId);
  if (!cage) return { issues: ["cage"] };

  const language = req.language ?? data.settings.invoiceLanguage;
  const lines = invoiceLines(data, booking, language);
  const totals = invoiceTotals(lines, data.settings.tax);
  const owner = data.owners.find((o) => o.id === data.pets.find((p) => p.id === booking.petId)?.ownerId);
  const year = Number(req.issuedOn.slice(0, 4));
  return {
    invoice: {
      id: req.id,
      bookingId,
      number: nextInvoiceNumber(data.invoices, data.settings.invoicePrefix, year),
      issuedOn: req.issuedOn,
      dueOn: req.dueOn ?? null,
      language,
      status: "issued",
      voidedOn: null,
      seller: {
        name: data.hotel.name,
        legalName: data.settings.legalName,
        address: data.settings.address,
        npwp: data.settings.npwp,
        paymentInstructions: data.settings.paymentInstructions,
      },
      customer: { name: owner?.name ?? "", whatsapp: owner?.whatsapp ?? "" },
      petNames: petNames(data, booking),
      stay: { checkIn: booking.checkIn, checkOut: booking.checkOut, nights: nights(booking.checkIn, booking.checkOut), cageName: cage.name },
      lines,
      ...totals,
      pricesIncludeTax: data.settings.tax.pkp && data.settings.tax.pricesIncludeTax,
    },
  };
}

export type InvoicePayment = "unpaid" | "partial" | "paid" | "unknown";

/** Whether an invoice has been paid, by the payments on its stay. "unknown" once the stay is gone from the records. */
export function invoicePayment(data: HotelData, invoice: Invoice): InvoicePayment {
  const booking = data.bookings.find((b) => b.id === invoice.bookingId);
  if (!booking) return "unknown";
  const paid = paidAmount(booking);
  return paid >= invoice.total ? "paid" : paid > 0 ? "partial" : "unpaid";
}

/** True when the stay's price no longer matches the invoice: a charge was added or changed after it was issued. */
export function invoiceOutdated(data: HotelData, invoice: Invoice): boolean {
  const booking = data.bookings.find((b) => b.id === invoice.bookingId);
  if (!booking || invoice.status === "void") return false;
  const cage = data.cages.find((c) => c.id === booking.cageId);
  const now = invoiceTotals(invoiceLines(data, booking, invoice.language), { pkp: invoice.taxPercent > 0, ppnPercent: invoice.taxPercent, pricesIncludeTax: invoice.pricesIncludeTax });
  return cage !== undefined && now.total !== invoice.total;
}

/** Invoices issued in a month ("2026-10"), in number order. */
export const invoicesIn = (invoices: Invoice[], month: string): Invoice[] =>
  invoices.filter((i) => i.issuedOn.startsWith(month)).sort((a, b) => a.number.localeCompare(b.number));

export type RegisterSummary = { count: number; voided: number; subtotal: number; tax: number; total: number };

/** What a month's invoices add up to. Voided invoices are counted as voided and add nothing. */
export function registerSummary(list: Invoice[]): RegisterSummary {
  const live = list.filter((i) => i.status === "issued");
  return {
    count: live.length,
    voided: list.length - live.length,
    subtotal: live.reduce((s, i) => s + i.subtotal, 0),
    tax: live.reduce((s, i) => s + i.taxAmount, 0),
    total: live.reduce((s, i) => s + i.total, 0),
  };
}

/** A sensible due date: a week after the stay ends, or the issue date when it has already ended. */
export const defaultDueDate = (booking: Pick<Booking, "checkOut">, issuedOn: ISODate): ISODate => addDays(booking.checkOut > issuedOn ? booking.checkOut : issuedOn, 7);

