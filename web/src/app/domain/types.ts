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
  /**
   * Out of use: not offered for new bookings and not counted as a place, but kept so the stays that were in it keep
   * their unit. A unit with any history is archived instead of deleted.
   */
  archived: boolean;
};

/**
 * What the hotel calls its places, so the screens speak its language: cages, rooms, or spaces. "none": the hotel
 * has no cages or rooms at all, just a total number of pets it takes at once. It then keeps exactly one hidden
 * shared unit holding that capacity and the price per pet, so availability and billing work as for a shared room,
 * but no screen shows a unit.
 */
export type UnitTerm = "cage" | "room" | "space" | "none";

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

/** Why a stay was cancelled: the owner called it off, the pet never came, or the hotel had to. */
export type CancelReason = "owner" | "no_show" | "hotel";

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
  /**
   * The nightly rate agreed when it was booked (per pet in a shared room). Kept on the stay, so changing the price
   * list later never changes what an old stay cost. Moving the stay to another unit takes that unit's rate.
   * 0 means none was recorded: the unit's current price is used.
   */
  rate: number;
  status: BookingStatus;
  /** Set when cancelled. */
  cancelReason: CancelReason | null;
  source: BookingSource;
  payments: Payment[];
  charges: Charge[];
  /** Filled at check-in; null if the pet was checked in without one. */
  arrival: Arrival | null;
  /**
   * Why a booked stay isn't confirmed yet (see PayPolicy). Absent: confirmed.
   * request: asked for, the place isn't checked or held yet; the hotel confirms the slot first.
   * deposit: the place is held, but the deposit (DP) the hotel asks for isn't paid yet.
   * Either way it can't be checked in.
   */
  hold?: BookingHold;
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

export type BookingHold = "request" | "deposit";

/**
 * How a new booking is taken. flexible: book now, pay the deposit whenever. deposit_first: the booking waits until at
 * least `depositPercent` of its price is paid. check_first: saved as a request; the hotel checks there is room and
 * confirms, and only then asks for payment.
 */
export type PayMode = "flexible" | "deposit_first" | "check_first";
export type PayPolicy = { mode: PayMode; /** Whole percent, 0–100, of the stay's price. */ depositPercent: number };

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
  /** Refuse check-in for a pet whose vaccination has run out or isn't on record, unless the card is seen at the door. */
  requireVaccine: boolean;
  payPolicy: PayPolicy;
};

/**
 * What running the hotel costs. Direct costs grow with the guests (food, litter, vet, grooming supplies);
 * operating costs are there whether the hotel is full or empty (staff, rent, utilities…).
 */
export type ExpenseCategory =
  | "food"
  | "supplies"
  | "vet"
  | "grooming"
  | "staff"
  | "rent"
  | "utilities"
  | "cleaning"
  | "marketing"
  | "maintenance"
  | "equipment"
  | "fees"
  | "other";

/** Money paid out, recorded by hand. */
export type Expense = {
  id: string;
  date: ISODate;
  category: ExpenseCategory;
  /** Rupiah, a whole number above zero. */
  amount: number;
  method: PaymentMethod;
  /** Who it was paid to: the shop, the landlord, the staff member. */
  vendor: string;
  note: string;
  /** A cost that comes back every month (rent, salaries), offered again at the start of the next month. */
  recurring: boolean;
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
  version: 6;
  hotel: Hotel | null;
  settings: HotelSettings;
  cages: Cage[];
  owners: Owner[];
  pets: Pet[];
  bookings: Booking[];
  careLog: CareEntry[];
  reportsSent: ReportSent[];
  invoices: Invoice[];
  expenses: Expense[];
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
  requireVaccine: false,
  payPolicy: { mode: "flexible", depositPercent: 30 },
});

export const emptyData = (): HotelData => ({
  version: 6,
  hotel: null,
  settings: defaultSettings(),
  cages: [],
  owners: [],
  pets: [],
  bookings: [],
  careLog: [],
  reportsSent: [],
  invoices: [],
  expenses: [],
});
