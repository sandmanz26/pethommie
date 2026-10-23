import { bookingTotal, hasNoUnits, nights } from "./logic";
import { balanceDue, paidAmount } from "./payments";
import { invoicePayment } from "./invoices";
import type { Booking, HotelData, Invoice } from "./types";

/** Cells that a spreadsheet would run as a formula get a leading quote, so a name like "=cmd()" stays text. A plain negative number stays a number. */
const safe = (cell: string) => (/^[=+\-@\t\r]/.test(cell) && !/^-\d+(\.\d+)?$/.test(cell) ? `'${cell}` : cell);

const escape = (cell: string) => {
  const s = safe(cell);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const toCsv = (rows: string[][]): string => rows.map((r) => r.map(escape).join(",")).join("\r\n") + "\r\n";

/** One row per stay, for a spreadsheet. Column names are the same in every language so the file can be reused. */
export function staysCsv(data: HotelData, bookings: Booking[] = data.bookings): string {
  const header = ["check_in", "check_out", "nights", "status", "pet", "owner", "whatsapp", "cage", "total", "paid", "balance", "notes", "source"];
  const rows = [...bookings]
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn))
    .map((b) => {
      const pet = data.pets.find((p) => p.id === b.petId);
      const owner = data.owners.find((o) => o.id === pet?.ownerId);
      const cage = data.cages.find((c) => c.id === b.cageId);
      return [
        b.checkIn,
        b.checkOut,
        String(nights(b.checkIn, b.checkOut)),
        b.status,
        pet?.name ?? "",
        owner?.name ?? "",
        owner?.whatsapp ?? "",
        hasNoUnits(data) ? "" : (cage?.name ?? ""),
        String(bookingTotal(b, cage)),
        String(paidAmount(b)),
        String(b.status === "cancelled" ? 0 : balanceDue(b, cage)),
        b.notes,
        b.source,
      ];
    });
  return toCsv([header, ...rows]);
}

/** The invoices given, one row each, for the monthly register. Voided ones are listed and marked. */
export function invoicesCsv(data: HotelData, invoices: Invoice[]): string {
  const header = ["number", "issued_on", "due_on", "status", "customer", "whatsapp", "pets", "check_in", "check_out", "subtotal", "tax_percent", "tax", "total", "payment", "language"];
  const rows = invoices.map((i) => [
    i.number,
    i.issuedOn,
    i.dueOn ?? "",
    i.status,
    i.customer.name,
    i.customer.whatsapp,
    i.petNames,
    i.stay.checkIn,
    i.stay.checkOut,
    String(i.subtotal),
    String(i.taxPercent),
    String(i.taxAmount),
    String(i.total),
    i.status === "void" ? "" : invoicePayment(data, i),
    i.language,
  ]);
  return toCsv([header, ...rows]);
}
