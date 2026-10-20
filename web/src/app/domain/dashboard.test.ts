import { describe, expect, it } from "vitest";
import { aBooking, aCage, anOwner, aPet, aSmallHotel } from "@/app/testing/fixtures";
import { dashboardFor, FORECAST_DAYS, MONTHS_SHOWN } from "./dashboard";
import type { Invoice, Payment } from "./types";

const today = "2026-10-20";
const pay = (amount: number, day: number, month = 10, kind: Payment["kind"] = "payment"): Payment => ({
  id: `${month}-${day}-${amount}-${kind}`,
  at: new Date(2026, month - 1, day, 10).toISOString(),
  amount,
  method: "cash",
  kind,
  reference: "",
  note: "",
});

const anInvoice = (id: string, bookingId: string, dueOn: string | null, total: number, status: Invoice["status"] = "issued"): Invoice => ({
  id,
  bookingId,
  number: `INV-2026-${id}`,
  issuedOn: "2026-10-01",
  dueOn,
  language: "id",
  status,
  voidedOn: null,
  seller: { name: "", legalName: "", address: "", npwp: "", paymentInstructions: "" },
  customer: { name: "", whatsapp: "" },
  petNames: "",
  stay: { checkIn: "2026-10-01", checkOut: "2026-10-03", nights: 2, cageName: "S1" },
  lines: [],
  subtotal: total,
  taxPercent: 0,
  taxAmount: 0,
  total,
  pricesIncludeTax: false,
});

const data = aSmallHotel({
  cages: [aCage("s1"), aCage("s2"), aCage("room", "M", 60_000, 3)],
  owners: [anOwner("o1")],
  pets: [
    aPet("p1", "o1", { vaccineExpiry: "2027-06-01" }),
    aPet("p2", "o1", { vaccineExpiry: "2026-10-01" }),
    aPet("p3", "o1", { vaccineExpiry: "2026-11-01" }),
    aPet("p4", "o1", { vaccineExpiry: "2020-01-01" }),
  ],
  bookings: [
    // here now, in the room with a companion: 2 of 3 places
    aBooking("in", { petId: "p1", companionIds: ["p2"], cageId: "room", checkIn: "2026-10-18", checkOut: "2026-10-23", status: "checked_in", payments: [pay(100_000, 18)] }),
    // arriving today in s1
    aBooking("arr", { petId: "p3", cageId: "s1", checkIn: today, checkOut: "2026-10-22" }),
    // arriving in 5 days; and one in 8 days (outside the week)
    aBooking("soon", { petId: "p3", cageId: "s2", checkIn: "2026-10-25", checkOut: "2026-10-27" }),
    aBooking("later", { petId: "p4", cageId: "s2", checkIn: "2026-10-28", checkOut: "2026-10-30" }),
    // went home last month, owes money; paid part in September (on the 10th, and on the 25th, after the cut)
    aBooking("gone", { petId: "p4", cageId: "s1", checkIn: "2026-09-08", checkOut: "2026-09-10", status: "checked_out", payments: [pay(30_000, 10, 9), pay(40_000, 25, 9)] }),
    // left early: no longer holds s2 tomorrow
    aBooking("early", { petId: "p4", cageId: "s2", checkIn: "2026-10-19", checkOut: "2026-10-24", status: "checked_out", payments: [pay(250_000, 19)] }),
  ],
  invoices: [anInvoice("1", "gone", "2026-10-10", 100_000), anInvoice("2", "early", "2026-10-10", 250_000), anInvoice("3", "gone", "2026-10-30", 100_000), anInvoice("4", "gone", "2026-10-01", 100_000, "void")],
});
const d = dashboardFor(data, today);

describe("dashboardFor", () => {
  it("counts tonight's places across cages and shared rooms", () => {
    expect(d.places).toBe(5);
    expect(d.tonight).toEqual({ occupied: 3, places: 5 }); // room 2 + s1 (arriving today)
    expect([d.arrivingToday, d.inHouse, d.leavingToday]).toEqual([1, 1, 0]);
  });

  it("compares this month so far with last month up to the same day", () => {
    expect(d.monthToDate.received).toBe(350_000);
    expect(d.lastMonthToDate.received).toBe(30_000);
    expect(d.lastMonthToDate.stays).toBe(1);
  });

  it("lists money in for the last months, this one last", () => {
    expect(d.months).toHaveLength(MONTHS_SHOWN);
    expect(d.months.map((m) => m.month)).toEqual(["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"]);
    expect(d.months.slice(-2).map((m) => m.received)).toEqual([70_000, 350_000]);
  });

  it("forecasts the places booked night by night, without stays that already ended", () => {
    expect(d.forecast).toHaveLength(FORECAST_DAYS);
    expect(d.forecast.slice(0, 4).map((f) => f.occupied)).toEqual([3, 3, 2, 0]);
    expect(d.forecast.find((f) => f.date === "2026-10-25")?.occupied).toBe(1);
  });

  it("knows what's owed and what's coming", () => {
    expect(d.owed.left).toBe(1);
    expect(d.arrivingSoon.map((b) => b.id)).toEqual(["arr", "soon"]);
  });

  it("flags vaccines of pets here or coming this week, not the others", () => {
    expect(d.vaccineAlerts.map((p) => p.id)).toEqual(["p2", "p3"]);
  });

  it("lists invoices past due and not paid, never a void or a paid one", () => {
    expect(d.overdueInvoices.map((i) => i.id)).toEqual(["1"]);
  });

  it("has no tax line until the hotel sets up its tax", () => {
    expect(d.taxThisMonth).toBeNull();
    const taxed = dashboardFor({ ...data, settings: { ...data.settings, tax: { ...data.settings.tax, regime: "final_umkm", taxpayer: "other" } } }, today);
    expect(taxed.taxThisMonth).toMatchObject({ pph: 350_000 * 0.005, dueOn: "2026-11-15" });
  });
});
