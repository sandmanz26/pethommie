import { addDays, generateCages, newId, todayISO } from "@/app/domain/logic";
import type { Arrival, Booking, CareEntry, HotelData, ISODate, Owner, Pet, ReportSent } from "@/app/domain/types";

/** Local time `hour:minute` on a calendar day, as an ISO date-time. */
const at = (day: ISODate, hour: number, minute: number) => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d, hour, minute).toISOString();
};

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
  const b = (petIdx: number, cageIdx: number, inOffset: number, outOffset: number, status: Booking["status"], deposit: number, arrival: Arrival | null = null): Booking => ({
    id: newId(),
    petId: pets[petIdx].id,
    cageId: cages[cageIdx].id,
    checkIn: addDays(today, inOffset),
    checkOut: addDays(today, outOffset),
    status,
    payments: deposit > 0 ? [{ id: newId(), at: new Date().toISOString(), amount: deposit, method: deposit % 100_000 === 0 ? "qris" : "cash", note: "" }] : [],
    arrival,
    notes: "",
    createdAt: new Date().toISOString(),
  });
  const arrivedAt = (daysAgo: number) => at(addDays(today, -daysAgo), 9, 15);
  const bookings = [
    b(0, 0, -2, 3, "checked_in", 100_000, {
      at: arrivedAt(2),
      healthy: true,
      fleaFree: true,
      weightKg: 4.2,
      belongings: "1 tas, selimut",
      food: "Royal Canin bawaan, 2x sehari, sekitar 50 g",
      notes: "",
    }),
    b(1, 6, -3, 0, "checked_in", 150_000, { at: arrivedAt(3), healthy: true, fleaFree: true, weightKg: 7.8, belongings: "Harness, 1 mainan", food: "Makanan kering bawaan, 3x sehari", notes: "Takut suara petir" }),
    b(2, 1, 0, 4, "booked", 50_000),
    b(3, 10, 0, 5, "booked", 200_000),
    b(4, 2, 2, 6, "booked", 0),
    b(0, 0, -20, -15, "checked_out", 100_000),
  ];

  // A few days of care, so the daily report has something to say the first time you open it.
  const entry = (booking: Booking, day: ISODate, hour: number, minute: number, kind: CareEntry["kind"], preset: string | null, note = ""): CareEntry => ({
    id: newId(),
    bookingId: booking.id,
    at: at(day, hour, minute),
    kind,
    preset,
    note,
  });
  const [mochi, kopi] = bookings;
  const yesterday = addDays(today, -1);
  const careLog: CareEntry[] = [
    entry(mochi, addDays(today, -2), 12, 0, "meal", "most"),
    entry(mochi, yesterday, 7, 30, "meal", "all"),
    entry(mochi, yesterday, 10, 0, "play", "20min"),
    entry(mochi, yesterday, 17, 30, "meal", "all"),
    entry(mochi, today, 7, 30, "meal", "all"),
    entry(mochi, today, 8, 15, "toilet", "both"),
    entry(mochi, today, 9, 0, "mood", "happy"),
    entry(kopi, yesterday, 8, 0, "meal", "little"),
    entry(kopi, yesterday, 14, 20, "incident", null, "Sempat muntah sekali setelah makan siang. Kami pantau, makan normal setelahnya."),
    entry(kopi, today, 7, 40, "meal", "most"),
    entry(kopi, today, 8, 30, "play", "30min"),
  ];
  const reportsSent: ReportSent[] = [{ bookingId: mochi.id, date: yesterday, at: at(yesterday, 18, 0) }];
  return {
    version: 2,
    hotel: { name: "Rumah Meong Bintaro", city: "South Tangerang", whatsapp: "6281200001111", createdAt: new Date().toISOString() },
    cages,
    owners,
    pets,
    bookings,
    careLog,
    reportsSent,
  };
}
