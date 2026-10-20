import type { Arrival, Booking, CareEntry, Cage, Charge, HotelData, HotelSettings, ISODate, Invoice, Owner, Payment, Pet } from "@/app/domain/types";
import { emptyData } from "@/app/domain/types";
import { uuidFor } from "./ids";

/**
 * The hotel's data as rows of the server's tables (backend/supabase/migrations/0001_init.sql), and back.
 * Pure: no network, no database. It is the one place that knows both shapes, so changing a record means changing
 * this file, the migration, and schema.test.ts, which runs all three against a real Postgres.
 *
 * Ids that aren't UUIDs (old or hand-made ones) become fixed UUIDs, the same every time, with every reference
 * following. Row timestamps (`created_at`, `updated_at`, `deleted_at`) belong to the server and are not here.
 */

export type HotelRow = { id: string; name: string; city: string; whatsapp: string; settings: HotelSettings; created_at: string };
export type CageRow = { id: string; hotel_id: string; name: string; size: string; price_per_night: number };
export type OwnerRow = { id: string; hotel_id: string; name: string; whatsapp: string; language: string };
export type PetRow = { id: string; hotel_id: string; owner_id: string; name: string; species: string; breed: string; vaccine_expiry: string | null; notes: string };
export type BookingRow = {
  id: string;
  hotel_id: string;
  pet_id: string;
  cage_id: string;
  check_in: string;
  check_out: string;
  status: string;
  arrival: Arrival | null;
  notes: string;
  created_at: string;
};
/** A pet sharing the stay's cage, besides the one it was booked for. */
export type BookingPetRow = { hotel_id: string; booking_id: string; pet_id: string; position: number };
export type ChargeRow = { id: string; hotel_id: string; booking_id: string; position: number; label: string; amount: number };
export type InvoiceRow = {
  id: string;
  hotel_id: string;
  /** The stay it was made for. No foreign key: the invoice outlives the stay's record. */
  booking_id: string;
  number: string;
  issued_on: string;
  due_on: string | null;
  language: string;
  status: string;
  voided_on: string | null;
  seller: Invoice["seller"];
  customer: Invoice["customer"];
  pet_names: string;
  stay: Invoice["stay"];
  lines: Invoice["lines"];
  subtotal: number;
  tax_percent: number;
  tax_amount: number;
  total: number;
  prices_include_tax: boolean;
};
export type PaymentRow = { id: string; hotel_id: string; booking_id: string; paid_at: string; amount: number; method: string; note: string };
export type CareEntryRow = { id: string; hotel_id: string; booking_id: string; at: string; kind: string; preset: string | null; note: string };
export type ReportSentRow = { hotel_id: string; booking_id: string; report_date: string; sent_at: string };

export type Rows = {
  cages: CageRow[];
  owners: OwnerRow[];
  pets: PetRow[];
  bookings: BookingRow[];
  booking_pets: BookingPetRow[];
  payments: PaymentRow[];
  charges: ChargeRow[];
  care_entries: CareEntryRow[];
  reports_sent: ReportSentRow[];
  invoices: InvoiceRow[];
};
export type Table = keyof Rows;

/** Parents before children: the order to write in, and (reversed) to remove in. */
export const TABLES: readonly Table[] = ["cages", "owners", "pets", "bookings", "booking_pets", "payments", "charges", "care_entries", "reports_sent", "invoices"];

export const emptyRows = (): Rows => ({ cages: [], owners: [], pets: [], bookings: [], booking_pets: [], payments: [], charges: [], care_entries: [], reports_sent: [], invoices: [] });

/** The same instant in the one text form the app writes, whatever form the server answered in. */
export function iso(value: string | Date, fallback: string): string {
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? fallback : new Date(t).toISOString();
}

export function toRows(data: HotelData, hotelId: string): { hotel: HotelRow; rows: Rows } {
  const hotel = data.hotel;
  const h = uuidFor(hotelId);
  const u = (id: string) => uuidFor(id, h);
  const epoch = hotel?.createdAt ? iso(hotel.createdAt, new Date(0).toISOString()) : new Date(0).toISOString();
  const createdOf = new Map(data.bookings.map((b) => [b.id, iso(b.createdAt, epoch)]));

  return {
    hotel: { id: h, name: hotel?.name ?? "", city: hotel?.city ?? "", whatsapp: hotel?.whatsapp ?? "", settings: data.settings, created_at: epoch },
    rows: {
      cages: data.cages.map((c) => ({ id: u(c.id), hotel_id: h, name: c.name, size: c.size, price_per_night: c.pricePerNight })),
      owners: data.owners.map((o) => ({ id: u(o.id), hotel_id: h, name: o.name, whatsapp: o.whatsapp, language: o.language })),
      pets: data.pets.map((p) => ({
        id: u(p.id),
        hotel_id: h,
        owner_id: u(p.ownerId),
        name: p.name,
        species: p.species,
        breed: p.breed,
        vaccine_expiry: p.vaccineExpiry || null,
        notes: p.notes,
      })),
      bookings: data.bookings.map((b) => ({
        id: u(b.id),
        hotel_id: h,
        pet_id: u(b.petId),
        cage_id: u(b.cageId),
        check_in: b.checkIn,
        check_out: b.checkOut,
        status: b.status,
        arrival: b.arrival,
        notes: b.notes,
        created_at: createdOf.get(b.id)!,
      })),
      booking_pets: data.bookings.flatMap((b) => b.companionIds.map((pet, position) => ({ hotel_id: h, booking_id: u(b.id), pet_id: u(pet), position }))),
      charges: data.bookings.flatMap((b) => b.charges.map((c, position) => ({ id: u(c.id), hotel_id: h, booking_id: u(b.id), position, label: c.label, amount: c.amount }))),
      payments: data.bookings.flatMap((b) =>
        b.payments.map((p) => ({
          id: u(p.id),
          hotel_id: h,
          booking_id: u(b.id),
          // A payment with no usable time (it should not happen) is dated by its stay rather than failing the whole upload.
          paid_at: iso(p.at, createdOf.get(b.id)!),
          amount: p.amount,
          method: p.method,
          note: p.note,
        })),
      ),
      care_entries: data.careLog.map((e) => ({
        id: u(e.id),
        hotel_id: h,
        booking_id: u(e.bookingId),
        at: iso(e.at, epoch),
        kind: e.kind,
        preset: e.preset,
        note: e.note,
      })),
      reports_sent: data.reportsSent.map((r) => ({ hotel_id: h, booking_id: u(r.bookingId), report_date: r.date, sent_at: iso(r.at, epoch) })),
      invoices: data.invoices.map((i) => ({
        id: u(i.id),
        hotel_id: h,
        booking_id: u(i.bookingId),
        number: i.number,
        issued_on: i.issuedOn,
        due_on: i.dueOn,
        language: i.language,
        status: i.status,
        voided_on: i.voidedOn,
        seller: i.seller,
        customer: i.customer,
        pet_names: i.petNames,
        stay: i.stay,
        lines: i.lines,
        subtotal: i.subtotal,
        tax_percent: i.taxPercent,
        tax_amount: i.taxAmount,
        total: i.total,
        prices_include_tax: i.pricesIncludeTax,
      })),
    },
  };
}

export function fromRows(hotel: HotelRow, rows: Rows): HotelData {
  const epoch = new Date(0).toISOString();
  const paymentsOf = new Map<string, Payment[]>();
  for (const p of rows.payments) {
    const list = paymentsOf.get(p.booking_id) ?? [];
    list.push({ id: p.id, at: iso(p.paid_at, epoch), amount: p.amount, method: p.method as Payment["method"], note: p.note });
    paymentsOf.set(p.booking_id, list);
  }
  const companionsOf = new Map<string, string[]>();
  for (const bp of [...rows.booking_pets].sort((a, b) => a.position - b.position)) companionsOf.set(bp.booking_id, [...(companionsOf.get(bp.booking_id) ?? []), bp.pet_id]);
  const chargesOf = new Map<string, Charge[]>();
  for (const c of [...rows.charges].sort((a, b) => a.position - b.position)) chargesOf.set(c.booking_id, [...(chargesOf.get(c.booking_id) ?? []), { id: c.id, label: c.label, amount: c.amount }]);
  const sortedPayments = (id: string) => (paymentsOf.get(id) ?? []).sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id));

  return {
    ...emptyData(),
    settings: hotel.settings,
    hotel: { name: hotel.name, city: hotel.city, whatsapp: hotel.whatsapp, createdAt: iso(hotel.created_at, epoch) },
    cages: rows.cages.map((c): Cage => ({ id: c.id, name: c.name, size: c.size as Cage["size"], pricePerNight: c.price_per_night })),
    owners: rows.owners.map((o): Owner => ({ id: o.id, name: o.name, whatsapp: o.whatsapp, language: o.language as Owner["language"] })),
    pets: rows.pets.map((p): Pet => ({ id: p.id, name: p.name, species: p.species as Pet["species"], breed: p.breed, ownerId: p.owner_id, vaccineExpiry: (p.vaccine_expiry ?? "") as ISODate | "", notes: p.notes })),
    bookings: rows.bookings.map(
      (b): Booking => ({
        id: b.id,
        petId: b.pet_id,
        companionIds: companionsOf.get(b.id) ?? [],
        charges: chargesOf.get(b.id) ?? [],
        cageId: b.cage_id,
        checkIn: b.check_in,
        checkOut: b.check_out,
        status: b.status as Booking["status"],
        payments: sortedPayments(b.id),
        arrival: b.arrival,
        notes: b.notes,
        createdAt: iso(b.created_at, epoch),
      }),
    ),
    careLog: rows.care_entries.map((e): CareEntry => ({ id: e.id, bookingId: e.booking_id, at: iso(e.at, epoch), kind: e.kind as CareEntry["kind"], preset: e.preset, note: e.note })),
    reportsSent: rows.reports_sent.map((r) => ({ bookingId: r.booking_id, date: r.report_date, at: iso(r.sent_at, epoch) })),
    invoices: rows.invoices.map(
      (i): Invoice => ({
        id: i.id,
        bookingId: i.booking_id,
        number: i.number,
        issuedOn: i.issued_on,
        dueOn: i.due_on,
        language: i.language as Invoice["language"],
        status: i.status as Invoice["status"],
        voidedOn: i.voided_on,
        seller: i.seller,
        customer: i.customer,
        petNames: i.pet_names,
        stay: i.stay,
        lines: i.lines,
        subtotal: i.subtotal,
        taxPercent: i.tax_percent,
        taxAmount: i.tax_amount,
        total: i.total,
        pricesIncludeTax: i.prices_include_tax,
      }),
    ),
  };
}
