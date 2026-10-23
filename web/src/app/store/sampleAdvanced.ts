import { addDays, bookingTotal, cageIsFree, isShared, newId, nights, todayISO } from "@/app/domain/logic";
import { bookingIssues } from "@/app/domain/bookingRules";
import { buildInvoice } from "@/app/domain/invoices";
import { paidAmount } from "@/app/domain/payments";
import {
  defaultSettings,
  type Booking,
  type BookingSource,
  type Cage,
  type CareEntry,
  type Expense,
  type Charge,
  type HotelData,
  type ISODate,
  type Owner,
  type Payment,
  type PaymentMethod,
  type Pet,
  type ReportSent,
  type Species,
} from "@/app/domain/types";

/**
 * A busy, established hotel for the advanced mode demo: fourteen cages and two shared rooms, about sixty regulars,
 * six months of stays with deposits, balances, refunds, add-ons, invoices and a care log, and a month of bookings
 * ahead. Generated from a fixed seed, so it is the same hotel every time (around today's date), and every stay obeys
 * the booking rules.
 */
export function advancedSample(today: ISODate = todayISO(), seed = 20261020): HotelData {
  const rnd = mulberry32(seed);
  const pick = <T,>(list: readonly T[]) => list[Math.floor(rnd() * list.length)];
  const chance = (p: number) => rnd() < p;
  const between = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
  const at = (day: ISODate, hour: number, minute = 0) => {
    const [y, m, d] = day.split("-").map(Number);
    return new Date(y, m - 1, d, hour, minute).toISOString();
  };

  const cage = (name: string, size: Cage["size"], pricePerNight: number, capacity = 1): Cage => ({ id: newId(), name, size, pricePerNight, capacity, archived: false });
  const cages: Cage[] = [
    ...range(6).map((i) => cage(`S-${pad(i + 1)}`, "S", 60_000)),
    ...range(5).map((i) => cage(`M-${pad(i + 1)}`, "M", 90_000)),
    ...range(3).map((i) => cage(`L-${pad(i + 1)}`, "L", 140_000)),
    cage("Ruang Kucing", "M", 55_000, 8),
    cage("Area Anjing Kecil", "S", 85_000, 6),
  ];
  const catRoom = cages.at(-2)!;
  const dogArea = cages.at(-1)!;

  const owners: Owner[] = OWNER_NAMES.map(([name, language], i) => ({ id: newId(), name, whatsapp: `628${String(1100000000 + i * 7_919_311).slice(0, 10)}`, language }));
  const pets: Pet[] = [];
  const size = new Map<string, Cage["size"]>();
  owners.forEach((owner, i) => {
    const count = i % 7 === 0 ? 3 : i % 3 === 0 ? 2 : 1;
    const species: Species = i % 3 === 1 ? "dog" : i % 11 === 5 ? "rabbit" : "cat";
    for (let k = 0; k < count; k++) {
      const [name, breed, petSize] = species === "dog" ? pick(DOGS) : species === "rabbit" ? pick(RABBITS) : pick(CATS);
      const pet: Pet = {
        id: newId(),
        name: pets.some((p) => p.ownerId === owner.id && p.name === name) ? `${name} ${k + 1}` : name,
        species,
        breed,
        ownerId: owner.id,
        vaccineExpiry: chance(0.08) ? "" : addDays(today, between(-25, 380)),
        notes: chance(0.3) ? pick(PET_NOTES) : "",
      };
      pets.push(pet);
      size.set(pet.id, petSize);
    }
  });

  const data: HotelData = {
    version: 6,
    hotel: { name: "Kandang Ceria Pet Hotel", city: "Jakarta Selatan", whatsapp: "6281399001122", createdAt: at(addDays(today, -400), 9) },
    settings: {
      ...defaultSettings(),
      legalName: "CV Kandang Ceria",
      address: "Jl. Kemang Raya 18, Jakarta Selatan",
      npwp: "01.234.567.8-912.000",
      invoicePrefix: "KCP",
      paymentInstructions: "BCA 5230 118 899 a.n. CV Kandang Ceria · QRIS tersedia di kasir",
      tax: { ...defaultSettings().tax, regime: "final_umkm", taxpayer: "other", basis: "cash" },
    },
    cages,
    owners,
    pets,
    bookings: [],
    careLog: [],
    reportsSent: [],
    invoices: [],
    expenses: [],
  };

  // ---------- stays, day by day ----------
  const petsOf = (ownerId: string) => pets.filter((p) => p.ownerId === ownerId);
  const unitsFor = (party: Pet[]): Cage[] => {
    const lead = party[0];
    const want = size.get(lead.id) ?? "M";
    const own = cages.filter((c) => !isShared(c) && (c.size === want || (want === "S" && c.size === "M")));
    if (lead.species === "cat" && chance(0.45)) return [catRoom, ...own];
    if (lead.species === "dog" && want === "S" && chance(0.35)) return [dogArea, ...own];
    return own;
  };

  // When a booking was made: one to three weeks ahead, but never later than this morning.
  const madeOn = (checkIn: ISODate) => {
    const day = addDays(checkIn, -between(1, 21));
    return day < today ? at(day, between(8, 21), between(0, 59)) : at(addDays(today, -between(1, 6)), between(8, 21), between(0, 59));
  };

  for (let d = -175; d <= 28; d++) {
    const day = addDays(today, d);
    const weekend = [5, 6].includes(new Date(`${day}T12:00:00`).getDay());
    const arrivals = between(1, weekend ? 6 : 4);
    for (let a = 0; a < arrivals; a++) {
      // The last ten owners are new: their first stays are in the last six weeks.
      const owner = pick(d < -42 ? owners.slice(0, -10) : owners);
      const own = petsOf(owner.id);
      const lead = pick(own);
      const siblings = own.filter((p) => p.id !== lead.id && p.species === lead.species);
      const party = siblings.length && chance(0.35) ? [lead, siblings[0]] : [lead];
      const length = pick([1, 2, 2, 3, 3, 3, 4, 5, 5, 7, 7, 10, 14]);
      const checkOut = addDays(day, length);
      const base: Booking = {
        id: newId(),
        petId: lead.id,
        companionIds: party.slice(1).map((p) => p.id),
        cageId: "",
        checkIn: day,
        checkOut,
        rate: 0,
        status: "booked",
        cancelReason: null,
        source: pickWeighted(rnd, SOURCES),
        payments: [],
        charges: [],
        arrival: null,
        notes: chance(0.15) ? pick(STAY_NOTES) : "",
        createdAt: madeOn(day),
      };
      const unit = unitsFor(party).find((c) => cageIsFree(data, c.id, day, checkOut, undefined, isShared(c) ? party.length : 1));
      if (!unit) continue;
      const booking = { ...base, cageId: unit.id, rate: unit.pricePerNight };
      if (bookingIssues(data, booking).length) continue;
      data.bookings.push(booking);
    }
  }

  // ---------- what happened to each stay ----------
  data.bookings = data.bookings.map((b) => {
    const unit = cages.find((c) => c.id === b.cageId)!;
    const charges: Charge[] = [];
    if (chance(0.25)) charges.push({ id: newId(), label: "Grooming", amount: pick([75_000, 120_000]) });
    if (chance(0.12)) charges.push({ id: newId(), label: "Antar jemput", amount: 50_000 });
    if (!isShared(unit) && b.companionIds.length) charges.push({ id: newId(), label: "Hewan tambahan", amount: 25_000 * nights(b.checkIn, b.checkOut) });
    if (chance(0.07)) charges.push({ id: newId(), label: "Diskon langganan", amount: -25_000 });

    const finished = b.checkOut <= today && b.checkIn < today;
    const staying = b.checkIn <= today && today < b.checkOut;
    const cancelled = chance(finished ? 0.05 : b.checkIn > today ? 0.08 : 0);
    // Some of today's arrivals haven't come in yet, and some of today's departures haven't left yet.
    const notYetIn = staying && b.checkIn === today && chance(0.6);
    const notYetOut = b.checkOut === today && b.checkIn < today && chance(0.5);
    const status: Booking["status"] = cancelled ? "cancelled" : notYetIn ? "booked" : staying || notYetOut ? "checked_in" : finished ? "checked_out" : "booked";
    const priced = { ...b, charges };
    const total = bookingTotal(priced, unit);
    const payments: Payment[] = [];
    const method = (): PaymentMethod => pickWeighted(rnd, METHODS);
    if (chance(0.65)) {
      const deposit = Math.round((total * 0.5) / 5_000) * 5_000;
      if (deposit > 0) payments.push({ id: newId(), at: b.createdAt, amount: deposit, method: method(), kind: "deposit", reference: chance(0.5) ? `TRX${between(100000, 999999)}` : "", note: "" });
    }
    if (status === "checked_out") {
      const owed = total - paidAmount({ payments });
      // Most pay in full at pickup; some leave part of it for later, a few still owe all of it. Old debts are mostly settled.
      const pay = chance(b.checkOut < addDays(today, -30) ? 0.985 : 0.9) ? owed : chance(0.6) ? Math.round(owed / 2 / 5_000) * 5_000 : 0;
      if (pay > 0) payments.push({ id: newId(), at: b.checkOut === today ? at(today, 8, between(0, 59)) : at(b.checkOut, between(10, 17), between(0, 59)), amount: pay, method: method(), kind: "payment", reference: "", note: "" });
    }
    if (status === "cancelled" && payments.length && chance(0.6)) {
      payments.push({ id: newId(), at: b.checkIn >= today ? at(today, 8) : at(b.checkIn, 11), amount: Math.round(payments[0].amount / 2 / 5_000) * 5_000, method: "transfer", kind: "refund", reference: "", note: "Pembatalan, DP kembali separuh" });
    }
    const arrival =
      status === "checked_in" || status === "checked_out"
        ? { at: at(b.checkIn, between(8, 11), between(0, 59)), healthy: chance(0.93), fleaFree: chance(0.95), weightKg: Math.round((2 + rnd() * 20) * 10) / 10, belongings: pick(BELONGINGS), food: pick(FOODS), notes: "" }
        : null;
    // A past stay that was cancelled is often a pet that simply never came.
    const cancelReason: Booking["cancelReason"] = status !== "cancelled" ? null : finished ? (chance(0.6) ? "no_show" : "owner") : chance(0.15) ? "hotel" : "owner";
    return { ...priced, status, cancelReason, payments, arrival };
  });

  // ---------- care log and reports for the pets staying now ----------
  const careLog: CareEntry[] = [];
  const reportsSent: ReportSent[] = [];
  for (const b of data.bookings.filter((x) => x.status === "checked_in")) {
    for (let day = b.checkIn > addDays(today, -2) ? b.checkIn : addDays(today, -2); day <= today; day = addDays(day, 1)) {
      const log = (hour: number, kind: CareEntry["kind"], preset: string | null, note = "") => careLog.push({ id: newId(), bookingId: b.id, at: at(day, hour, between(0, 50)), kind, preset, note });
      log(7, "meal", pick(["all", "all", "most", "little"]));
      if (day < today || chance(0.6)) log(10, "play", pick(["10min", "20min", "30min"]));
      log(12, "toilet", "both");
      if (day < today) log(17, "meal", pick(["all", "most"]));
      if (chance(0.15)) log(14, "incident", null, "Sedikit muntah setelah makan siang, sudah membaik.");
      if (day < today) reportsSent.push({ bookingId: b.id, date: day, at: at(day, 18, 5) });
    }
  }
  data.careLog = careLog;
  data.reportsSent = reportsSent;

  // ---------- invoices, in the order the stays finished ----------
  const toInvoice = data.bookings.filter((b) => b.status === "checked_out" && chance(0.8)).sort((a, b) => a.checkOut.localeCompare(b.checkOut));
  for (const b of toInvoice) {
    const owner = owners.find((o) => o.id === pets.find((p) => p.id === b.petId)?.ownerId);
    const made = buildInvoice(data, b.id, { id: newId(), issuedOn: b.checkOut, dueOn: addDays(b.checkOut, 7), language: owner?.language });
    if ("invoice" in made) data.invoices.push(made.invoice);
  }
  // Two invoices had a mistake: voided (the number stays used) and made again.
  for (const wrong of data.invoices.slice(3, 5)) {
    data.invoices = data.invoices.map((i) => (i.id === wrong.id ? { ...i, status: "void", voidedOn: wrong.issuedOn } : i));
    const again = buildInvoice(data, wrong.bookingId, { id: newId(), issuedOn: wrong.issuedOn, dueOn: wrong.dueOn, language: wrong.language });
    if ("invoice" in again) data.invoices.push(again.invoice);
  }
  data.expenses = expensesFor(data, today, rnd);
  return data;
}

/**
 * Six months of what a 28-place hotel spends: rent, three staff, bills every month; pet food and litter bought each
 * week in step with the guests; the vet, repairs, ads and card fees now and then. Nothing after today.
 */
function expensesFor(data: HotelData, today: ISODate, rnd: () => number): Expense[] {
  const between = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
  const round = (n: number) => Math.round(n / 1_000) * 1_000;
  const out: Expense[] = [];
  const add = (date: ISODate, category: Expense["category"], amount: number, method: Expense["method"], vendor: string, note = "", recurring = false) => {
    if (date <= today && amount > 0) out.push({ id: newId(), date, category, amount: round(amount), method, vendor, note, recurring });
  };
  const petNights = (from: ISODate, to: ISODate) =>
    data.bookings
      .filter((b) => b.status !== "cancelled")
      .reduce((n, b) => n + Math.max(0, nights(b.checkIn > from ? b.checkIn : from, b.checkOut < to ? b.checkOut : to)) * (1 + b.companionIds.length), 0);

  let month = addDays(today, -175).slice(0, 7);
  const last = today.slice(0, 7);
  for (let i = 0; month <= last && i < 12; i++) {
    const day = (d: number) => `${month}-${String(d).padStart(2, "0")}`;
    add(day(1), "rent", 6_000_000, "transfer", "Pak Hendro (pemilik ruko)", "Sewa ruko Kemang", true);
    add(day(25), "staff", 3_200_000, "transfer", "Rudi", "Gaji perawat", true);
    add(day(25), "staff", 3_200_000, "transfer", "Wati", "Gaji perawat", true);
    add(day(25), "staff", 2_600_000, "transfer", "Andi", "Gaji resepsionis paruh waktu", true);
    add(day(5), "utilities", between(1_500_000, 2_100_000), "transfer", "PLN", "Listrik, AC 24 jam");
    add(day(5), "utilities", 450_000, "transfer", "IndiHome", "Internet & CCTV", true);
    add(day(6), "utilities", between(180_000, 260_000), "transfer", "PDAM", "Air");
    add(day(10), "cleaning", between(350_000, 500_000), "cash", "Toko Bersih Jaya", "Disinfektan, sabun, kain pel");
    add(day(12), "marketing", between(400_000, 1_200_000), "card", "Meta Ads", "Iklan Instagram");
    if (rnd() < 0.5) add(day(between(8, 26)), "maintenance", between(250_000, 900_000), "cash", "Pak Joko", "Perbaikan pintu kandang & AC");
    if (rnd() < 0.25) add(day(between(3, 27)), "equipment", between(600_000, 2_400_000), "transfer", "Tokopedia", "Kandang lipat & tempat makan");
    // food and litter, bought weekly for the pet-nights of that week
    for (let w = 1; w <= 22; w += 7) {
      const from = day(w);
      const to = addDays(from, 7);
      const n = petNights(from, to);
      add(from, "food", n * between(7_500, 9_500), "transfer", "Toko Pakan Sejahtera", `Dry & wet food, ${n} malam anabul`);
      add(addDays(from, 1), "supplies", n * between(2_500, 3_500), "cash", "Pet Shop Kemang", "Pasir kucing, pee pad, plastik");
    }
    add(day(between(9, 23)), "vet", between(300_000, 1_100_000), "transfer", "Klinik drh. Sinta", "Pemeriksaan & obat tamu");
    add(day(15), "grooming", between(200_000, 450_000), "cash", "Pet Shop Kemang", "Sampo, sisir, gunting kuku");
    // card and QRIS fees on what came in that way
    const viaCard = data.bookings
      .flatMap((b) => b.payments)
      .filter((p) => (p.method === "qris" || p.method === "card") && p.kind !== "refund" && p.at.slice(0, 7) === month)
      .reduce((s, p) => s + p.amount, 0);
    add(day(28), "fees", viaCard * 0.007, "transfer", "Bank & QRIS", "Biaya MDR QRIS/kartu");
    month = addDays(`${month}-28`, 4).slice(0, 7);
  }
  return out;
}

// ---------- helpers and made-up names ----------

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickWeighted<T extends string>(rnd: () => number, weights: Record<T, number>): T {
  const entries = Object.entries(weights) as [T, number][];
  let roll = rnd() * entries.reduce((n, [, w]) => n + w, 0);
  for (const [value, w] of entries) {
    roll -= w;
    if (roll < 0) return value;
  }
  return entries[0][0];
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i);
const pad = (n: number) => String(n).padStart(2, "0");

const SOURCES: Record<BookingSource, number> = { whatsapp: 40, instagram: 20, walk_in: 12, referral: 10, link: 8, other: 10 };
const METHODS: Record<PaymentMethod, number> = { transfer: 40, qris: 30, cash: 18, ewallet: 8, card: 4 };

const OWNER_NAMES: [string, Owner["language"]][] = [
  ["Rina Kusuma", "id"], ["Budi Santoso", "id"], ["Sari Wijaya", "id"], ["Andi Pratama", "id"], ["Emma Clarke", "en"],
  ["Dewi Lestari", "id"], ["Agus Prasetyo", "id"], ["Maya Anggraini", "id"], ["Hendra Wijaya", "id"], ["Putri Ayu", "id"],
  ["Rizky Ramadhan", "id"], ["Lukas Meyer", "en"], ["Nadia Putri", "id"], ["Fajar Nugroho", "id"], ["Indah Permata", "id"],
  ["Yusuf Hakim", "id"], ["Citra Melati", "id"], ["Sophie Martin", "en"], ["Bayu Saputra", "id"], ["Ratna Sari", "id"],
  ["Dimas Aditya", "id"], ["Lina Marlina", "id"], ["Oscar Tan", "en"], ["Wulan Sari", "id"], ["Teguh Santosa", "id"],
  ["Ayu Wandira", "id"], ["Kevin Halim", "id"], ["Mira Hasan", "id"], ["Galih Permana", "id"], ["Tika Rahayu", "id"],
  ["Arief Budiman", "id"], ["Laras Ningrum", "id"], ["Daniel Wong", "en"], ["Siska Amelia", "id"], ["Reza Firmansyah", "id"],
  ["Novi Handayani", "id"], ["Bagas Wicaksono", "id"], ["Eka Susanti", "id"], ["Johan Siregar", "id"], ["Fitri Ramadhani", "id"],
  ["Hana Kim", "en"], ["Irfan Maulana", "id"], ["Vina Oktaviani", "id"], ["Rudi Hartono", "id"], ["Melinda Chandra", "id"],
  ["Taufik Hidayat", "id"], ["Dian Sastro", "id"], ["Yoga Pratama", "id"], ["Anisa Rahma", "id"], ["Ben Carter", "en"],
  ["Sinta Dewi", "id"], ["Wahyu Setiawan", "id"], ["Rani Puspita", "id"], ["Ilham Saputra", "id"], ["Gita Savitri", "id"],
  ["Hadi Gunawan", "id"], ["Kirana Larasati", "id"],
];
const CATS: [string, string, Cage["size"]][] = [
  ["Mochi", "Persian", "S"], ["Oyen", "Domestic", "S"], ["Luna", "British Shorthair", "S"], ["Milo", "Maine Coon", "M"], ["Kitty", "Domestic", "S"],
  ["Simba", "Bengal", "S"], ["Nala", "Ragdoll", "M"], ["Boba", "Domestic", "S"], ["Kopi", "Scottish Fold", "S"], ["Snow", "Persian", "S"],
  ["Cimol", "Domestic", "S"], ["Garfield", "Exotic Shorthair", "S"], ["Molly", "Ragdoll", "M"], ["Ciko", "Munchkin", "S"], ["Tom", "Domestic", "S"],
];
const DOGS: [string, string, Cage["size"]][] = [
  ["Bobi", "Golden Retriever", "L"], ["Coco", "Pomeranian", "S"], ["Max", "Siberian Husky", "L"], ["Choco", "Shih Tzu", "S"], ["Bruno", "Beagle", "M"],
  ["Lucky", "Corgi", "M"], ["Rocky", "Labrador", "L"], ["Momo", "Poodle", "S"], ["Doggo", "Kampung", "M"],
  ["Buddy", "Golden Retriever", "L"], ["Kiki", "Chihuahua", "S"], ["Oreo", "Border Collie", "M"], ["Bella", "Maltese", "S"], ["Thor", "German Shepherd", "L"],
];
const RABBITS: [string, string, Cage["size"]][] = [["Kelinci", "Holland Lop", "S"], ["Bunbun", "Netherland Dwarf", "S"]];
const PET_NOTES = ["Makan sendiri, 2x sehari", "Takut suara petir", "Alergi ayam", "Suka digendong", "Perlu jalan pagi"];
const STAY_NOTES = ["Minta foto tiap hari", "Pemilik ke luar kota", "Ada obat tetes mata", "Jemput sore"];
const BELONGINGS = ["1 tas, selimut", "Harness, mainan", "Kandang lipat", "Bantal kecil", "-"];
const FOODS = ["Royal Canin bawaan, 2x sehari", "Makanan basah sachet, 3x sehari", "Pakan hotel", "Whiskas bawaan"];
