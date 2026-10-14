import { addDays, generateCages, newId, todayISO } from "../domain/logic";
import type { Booking, HotelData, Owner, Pet } from "../domain/types";

/** A believable small hotel so a new user can explore every screen before entering real data. */
export function sampleData(): HotelData {
  const today = todayISO();
  const cages = generateCages({
    S: { count: 6, price: 50_000 },
    M: { count: 4, price: 75_000 },
    L: { count: 2, price: 120_000 },
  });
  const owners: Owner[] = [
    { id: newId(), name: "Rina Kusuma", whatsapp: "6281234567890" },
    { id: newId(), name: "Budi Santoso", whatsapp: "6285711223344" },
    { id: newId(), name: "Sari Wijaya", whatsapp: "6287855512345" },
    { id: newId(), name: "Andi Pratama", whatsapp: "6281399887766" },
  ];
  const pet = (name: string, species: Pet["species"], breed: string, owner: number, vaccineInDays: number | null, notes = ""): Pet => ({
    id: newId(),
    name,
    species,
    breed,
    ownerId: owners[owner].id,
    vaccineExpiry: vaccineInDays === null ? "" : addDays(today, vaccineInDays),
    notes,
  });
  const pets = [
    pet("Mochi", "cat", "Persian", 0, 200, "Eats own Royal Canin, twice a day"),
    pet("Kopi", "dog", "Shih Tzu", 1, 20, "Scared of thunder"),
    pet("Nala", "cat", "Domestic", 2, -10),
    pet("Bobi", "dog", "Golden Retriever", 3, 300, "Needs a long walk in the morning"),
    pet("Kelinci", "rabbit", "Holland Lop", 0, null),
  ];
  const b = (petIdx: number, cageIdx: number, inOffset: number, outOffset: number, status: Booking["status"], deposit: number): Booking => ({
    id: newId(),
    petId: pets[petIdx].id,
    cageId: cages[cageIdx].id,
    checkIn: addDays(today, inOffset),
    checkOut: addDays(today, outOffset),
    status,
    deposit,
    notes: "",
    createdAt: new Date().toISOString(),
  });
  const bookings = [
    b(0, 0, -2, 3, "checked_in", 100_000),
    b(1, 6, -3, 0, "checked_in", 150_000),
    b(2, 1, 0, 4, "booked", 50_000),
    b(3, 10, 0, 5, "booked", 200_000),
    b(4, 2, 2, 6, "booked", 0),
    b(0, 0, -20, -15, "checked_out", 100_000),
  ];
  return {
    version: 1,
    hotel: { name: "Rumah Meong Bintaro", city: "South Tangerang", whatsapp: "6281200001111", createdAt: new Date().toISOString() },
    cages,
    owners,
    pets,
    bookings,
  };
}
