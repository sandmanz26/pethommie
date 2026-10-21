import { emptyData, type Booking, type Cage, type CageSize, type CareEntry, type HotelData, type Owner, type Pet } from "@/app/domain/types";

/** Small builders for tests: just enough fields, with sensible defaults. */
export const aCage = (id: string, size: CageSize = "S", pricePerNight = 50_000, capacity = 1): Cage => ({ id, name: id.toUpperCase(), size, pricePerNight, capacity, archived: false });

export const anOwner = (id: string, whatsapp = "", language: Owner["language"] = "id"): Owner => ({ id, name: `Owner ${id}`, whatsapp, language });

export const aPet = (id: string, ownerId: string, over: Partial<Pet> = {}): Pet => ({
  id,
  name: `Pet ${id}`,
  species: "dog",
  breed: "",
  ownerId,
  vaccineExpiry: "",
  notes: "",
  ...over,
});

export const aBooking = (id: string, over: Pick<Booking, "petId" | "cageId" | "checkIn" | "checkOut"> & Partial<Booking>): Booking => ({
  id,
  rate: 0, // the unit's price
  status: "booked",
  cancelReason: null,
  source: "other",
  payments: [],
  charges: [],
  companionIds: [],
  arrival: null,
  notes: "",
  createdAt: "2026-10-01T00:00:00.000Z",
  ...over,
});

export const aHotel = (parts: Partial<HotelData> = {}): HotelData => ({
  ...emptyData(),
  hotel: { name: "Rumah Meong", city: "Bintaro", whatsapp: "6281234567890", createdAt: "2026-10-01T00:00:00.000Z" },
  ...parts,
});

/** Two cages, one owner with two pets, no bookings. */
export const aSmallHotel = (parts: Partial<HotelData> = {}): HotelData =>
  aHotel({
    cages: [aCage("s1"), aCage("s2"), aCage("m1", "M", 75_000)],
    owners: [anOwner("o1", "6281234567890")],
    pets: [aPet("p1", "o1"), aPet("p2", "o1", { species: "cat" })],
    ...parts,
  });

export const aCareEntry = (id: string, bookingId: string, over: Partial<CareEntry> = {}): CareEntry => ({
  id,
  bookingId,
  at: new Date(2026, 9, 14, 8, 0).toISOString(),
  kind: "meal",
  preset: "all",
  note: "",
  ...over,
});
