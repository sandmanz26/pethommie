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

/**
 * A place pets stay in. A cage holds one stay (its pets share it, at one price). A shared room or play area
 * (cage-free hotels, home boarding) holds `capacity` pets at once, each paying the nightly rate.
 */
export type Cage = {
  id: string;
  name: string;
  size: CageSize;
  /** Nightly rate in rupiah: for the cage, or for each pet in a shared room. */
  pricePerNight: number;
  /** 1 for a cage; the number of pets a shared room takes. */
  capacity: number;
};

/** What the hotel calls its places, so the screens speak its language: cages, rooms, or spaces. */
export type UnitTerm = "cage" | "room" | "space";

/** The language a person reads: the operator's screen, an owner's messages, an invoice. */
export type Language = "id" | "en";

export type Owner = {
  id: string;
  name: string;
  /** Normalised 62xxxxxxxxxx, or empty if unknown. */
  whatsapp: string;
  /** The language messages and invoices to this owner are written in. */
  language: Language;
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

export type PaymentMethod = "cash" | "qris" | "transfer" | "ewallet" | "card";
/** deposit: paid before the stay. payment: any other money in. refund: money given back (counts against the stay). */
export type PaymentKind = "deposit" | "payment" | "refund";

/** Money for a stay: a deposit, a part payment, the balance, or a refund. Recorded by hand: nothing here talks to a bank. */
export type Payment = {
  id: string;
  /** When it was received (or given back). */
  at: string;
  /** Rupiah, a whole number above zero. A refund is a positive amount with kind "refund". */
  amount: number;
  method: PaymentMethod;
  kind: PaymentKind;
  /** Transfer or QRIS reference, receipt number: whatever lets the operator find it in the bank later. */
  reference: string;
  note: string;
};

/** Where a booking came from, for the reports. */
export type BookingSource = "walk_in" | "whatsapp" | "instagram" | "link" | "referral" | "other";

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

/** Something added to or taken off a stay's price: grooming, pickup, an extra pet, a discount. */
export type Charge = {
  id: string;
  label: string;
  /** Rupiah, a whole number: above zero for an add-on, below zero for a discount. */
  amount: number;
};

export type Booking = {
  id: string;
  /** The pet the stay is booked for. */
  petId: string;
  /** Other pets of the same owner sharing the cage. Empty for a stay of one. */
  companionIds: string[];
  cageId: string;
  checkIn: ISODate;
  checkOut: ISODate;
  status: BookingStatus;
  source: BookingSource;
  payments: Payment[];
  charges: Charge[];
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

/** How the hotel is taxed. A setting, because it differs per business, and an estimate, never a filing. */
export type TaxProfile = {
  /** none: not set up. final_umkm: PPh final 0.5% on turnover. general: ordinary income tax (turnover is only listed). */
  regime: "none" | "final_umkm" | "general";
  /** An individual gets the first Rp500 million of a year's turnover untaxed under the final scheme. */
  taxpayer: "individual" | "other";
  /** Which turnover the estimate uses: money received, or stays completed. */
  basis: "cash" | "accrual";
  /** Registered for VAT (PKP). Off unless the hotel's advisor says otherwise. */
  pkp: boolean;
  /** The effective VAT rate in percent (11 for 12% on 11/12 of the price). */
  ppnPercent: number;
  /** Prices on the price list already contain the tax. */
  pricesIncludeTax: boolean;
};

/** Who the hotel is on paper, and how it is taxed: the top of every invoice. */
export type HotelSettings = {
  legalName: string;
  address: string;
  npwp: string;
  /** Start of invoice numbers, like "INV" in INV-2026-0001. */
  invoicePrefix: string;
  /** How to pay: bank account, QRIS, shown on every invoice. */
  paymentInstructions: string;
  invoiceLanguage: Language;
  tax: TaxProfile;
  unitTerm: UnitTerm;
};

export type InvoiceLine = { label: string; quantity: number; unitPrice: number; amount: number };

/**
 * An invoice, as it was the day it was made. Everything on it is copied in, so later changes to the booking, the
 * owner or the hotel's details never alter a document that has been given to a customer. A mistake is fixed by
 * voiding it (the number stays used) and issuing another.
 */
export type Invoice = {
  id: string;
  /** The stay it was made for. Kept even if the stay is later removed from the hotel's records. */
  bookingId: string;
  /** INV-2026-0001. Never reused, not even after voiding. */
  number: string;
  issuedOn: ISODate;
  dueOn: ISODate | null;
  language: Language;
  status: "issued" | "void";
  voidedOn: ISODate | null;
  seller: { name: string; legalName: string; address: string; npwp: string; paymentInstructions: string };
  customer: { name: string; whatsapp: string };
  petNames: string;
  stay: { checkIn: ISODate; checkOut: ISODate; nights: number; cageName: string };
  lines: InvoiceLine[];
  /** Before tax (the DPP). */
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  /** What the customer pays. */
  total: number;
  pricesIncludeTax: boolean;
};

export type HotelData = {
  version: 4;
  hotel: Hotel | null;
  settings: HotelSettings;
  cages: Cage[];
  owners: Owner[];
  pets: Pet[];
  bookings: Booking[];
  careLog: CareEntry[];
  reportsSent: ReportSent[];
  invoices: Invoice[];
};

export const defaultSettings = (): HotelSettings => ({
  legalName: "",
  address: "",
  npwp: "",
  invoicePrefix: "INV",
  paymentInstructions: "",
  invoiceLanguage: "id",
  tax: { regime: "none", taxpayer: "individual", basis: "cash", pkp: false, ppnPercent: 11, pricesIncludeTax: false },
  unitTerm: "cage",
});

export const emptyData = (): HotelData => ({
  version: 4,
  hotel: null,
  settings: defaultSettings(),
  cages: [],
  owners: [],
  pets: [],
  bookings: [],
  careLog: [],
  reportsSent: [],
  invoices: [],
});
