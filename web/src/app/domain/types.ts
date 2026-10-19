/** Core records for one pet hotel. Dates are local calendar days as "YYYY-MM-DD". */

export type ISODate = string;
export type CageSize = "S" | "M" | "L";
export type Species = "cat" | "dog" | "rabbit" | "other";
export type BookingStatus = "booked" | "checked_in" | "checked_out" | "cancelled";

export type Hotel = {
  name: string;
  city: string;
  whatsapp: string;
  createdAt: string;
};

export type Cage = {
  id: string;
  name: string;
  size: CageSize;
  /** Nightly rate in rupiah. */
  pricePerNight: number;
};

export type Owner = {
  id: string;
  name: string;
  /** Normalised 62xxxxxxxxxx, or empty if unknown. */
  whatsapp: string;
};

export type Pet = {
  id: string;
  name: string;
  species: Species;
  breed: string;
  ownerId: string;
  /** When the current vaccination expires; empty if not recorded. */
  vaccineExpiry: ISODate | "";
  notes: string;
};

export type PaymentMethod = "cash" | "qris" | "transfer";

/** Money received for a stay (a deposit, a part payment, the balance). Recorded by hand: nothing here talks to a bank. */
export type Payment = {
  id: string;
  /** When it was received. */
  at: string;
  /** Rupiah, a whole number above zero. */
  amount: number;
  method: PaymentMethod;
  note: string;
};

/** What the pet looked like when it arrived. The record an operator can point to if there is a dispute later. */
export type Arrival = {
  /** When the check-in was done. */
  at: string;
  /** No flu, cough or eye discharge. */
  healthy: boolean;
  /** No fleas or ticks. */
  fleaFree: boolean;
  weightKg: number | null;
  /** What came with the pet: bag, blanket, toys. */
  belongings: string;
  /** Food the owner brought, and how to feed it. */
  food: string;
  /** Marks, wounds, behaviour. */
  notes: string;
};

export type Booking = {
  id: string;
  petId: string;
  cageId: string;
  checkIn: ISODate;
  checkOut: ISODate;
  status: BookingStatus;
  payments: Payment[];
  /** Filled at check-in; null if the pet was checked in without one. */
  arrival: Arrival | null;
  notes: string;
  createdAt: string;
};

export type CareKind = "meal" | "drink" | "play" | "toilet" | "medicine" | "mood" | "note" | "incident";

/** One line in a pet's daily care log. */
export type CareEntry = {
  id: string;
  bookingId: string;
  /** When it happened (ISO date-time). */
  at: string;
  kind: CareKind;
  /** A one-tap answer ("all eaten"); the wording shown to the owner comes from the domain, so it is always Indonesian. */
  preset: string | null;
  /** Anything the staff typed. Required for notes and incidents. */
  note: string;
};

/** The day's report for this stay was sent to the owner. */
export type ReportSent = { bookingId: string; date: ISODate; at: string };

export type HotelData = {
  version: 2;
  hotel: Hotel | null;
  cages: Cage[];
  owners: Owner[];
  pets: Pet[];
  bookings: Booking[];
  careLog: CareEntry[];
  reportsSent: ReportSent[];
};

export const emptyData = (): HotelData => ({
  version: 2,
  hotel: null,
  cages: [],
  owners: [],
  pets: [],
  bookings: [],
  careLog: [],
  reportsSent: [],
});
