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

export type Booking = {
  id: string;
  petId: string;
  cageId: string;
  checkIn: ISODate;
  checkOut: ISODate;
  status: BookingStatus;
  /** Deposit already paid, in rupiah. */
  deposit: number;
  notes: string;
  createdAt: string;
};

export type HotelData = {
  version: 1;
  hotel: Hotel | null;
  cages: Cage[];
  owners: Owner[];
  pets: Pet[];
  bookings: Booking[];
};

export const emptyData = (): HotelData => ({
  version: 1,
  hotel: null,
  cages: [],
  owners: [],
  pets: [],
  bookings: [],
});
