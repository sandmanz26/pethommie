import { describe, expect, it } from "vitest";
import { aBooking, aPet, aSmallHotel, anOwner } from "@/app/testing/fixtures";
import { cageIsFree, freePlaces, poolCage, todayBoard } from "@/app/domain/logic";
import { calendarBars } from "@/app/domain/calendar";
import { defaultSettings, type HotelData, type PayPolicy, type Payment } from "@/app/domain/types";
import { cancelBooking, checkInBooking, confirmBooking, recordPayment, saveSettings, settingsIssues, upsertBooking } from "./actions";

// s1 costs Rp50.000 a night: 4 nights is Rp200.000, so a 30% deposit is Rp60.000.
const stay = aBooking("b1", { petId: "p1", cageId: "s1", checkIn: "2026-10-14", checkOut: "2026-10-18", rate: 50_000 });
const hotel = (mode: PayPolicy["mode"], depositPercent = 30, parts: Partial<HotelData> = {}) =>
  aSmallHotel({ settings: { ...defaultSettings(), payPolicy: { mode, depositPercent } }, ...parts });
const pay = (amount: number, kind: Payment["kind"] = "deposit"): Omit<Payment, "id"> => ({ at: "2026-10-10T10:00:00.000Z", amount, method: "transfer", kind, reference: "", note: "" });
const withDeposit = (amount: number) => ({ ...stay, payments: [{ ...pay(amount), id: "d1" }] });
const create = (s: HotelData, b = stay) => {
  const out = upsertBooking(s, b);
  expect(out.result).toEqual([]);
  return out.state;
};
const find = (s: HotelData, id = "b1") => s.bookings.find((b) => b.id === id)!;

describe("a flexible hotel (book now, pay later)", () => {
  it("confirms a new booking with nothing paid, and lets it check in", () => {
    const s = create(hotel("flexible"));
    expect(find(s).hold).toBeUndefined();
    expect(checkInBooking(s, "b1", null).result).toBe(true);
  });
});

describe("a deposit-first hotel", () => {
  it("holds the place but waits for the deposit; the deposit confirms it; then it can check in", () => {
    let s = create(hotel("deposit_first"));
    expect(find(s).hold).toBe("deposit");
    // the place is held: nobody else can take it
    expect(cageIsFree(s, "s1", "2026-10-14", "2026-10-18")).toBe(false);
    expect(checkInBooking(s, "b1", null)).toEqual({ state: s, result: false });
    // not enough yet
    s = recordPayment(s, "b1", pay(30_000)).state;
    expect(find(s).hold).toBe("deposit");
    s = recordPayment(s, "b1", pay(30_000)).state;
    expect(find(s).hold).toBeUndefined();
    expect(checkInBooking(s, "b1", null).result).toBe(true);
  });

  it("confirms a booking made with the deposit already paid", () => {
    expect(find(create(hotel("deposit_first"), withDeposit(60_000))).hold).toBeUndefined();
    expect(find(create(hotel("deposit_first"), withDeposit(59_999))).hold).toBe("deposit");
  });

  it("asks nothing at 0%", () => {
    expect(find(create(hotel("deposit_first", 0))).hold).toBeUndefined();
  });

  it("a refund does not confirm a stay", () => {
    let s = create(hotel("deposit_first"), withDeposit(10_000));
    s = recordPayment(s, "b1", pay(5_000, "refund")).state;
    expect(find(s).hold).toBe("deposit");
  });
});

describe("a check-first hotel", () => {
  it("saves a request that holds nothing; confirming checks the slot, then it waits for the deposit, then checks in", () => {
    let s = create(hotel("check_first"));
    expect(find(s).hold).toBe("request");
    expect(cageIsFree(s, "s1", "2026-10-14", "2026-10-18")).toBe(true);
    expect(checkInBooking(s, "b1", null).result).toBe(false);
    s = confirmBooking(s, "b1").state;
    expect(find(s).hold).toBe("deposit");
    expect(cageIsFree(s, "s1", "2026-10-14", "2026-10-18")).toBe(false);
    expect(checkInBooking(s, "b1", null).result).toBe(false);
    s = recordPayment(s, "b1", pay(60_000)).state;
    expect(find(s).hold).toBeUndefined();
    expect(checkInBooking(s, "b1", null).result).toBe(true);
  });

  it("confirms straight away when the deposit is already paid, or none is asked", () => {
    expect(find(confirmBooking(create(hotel("check_first"), withDeposit(60_000)), "b1").state).hold).toBeUndefined();
    expect(find(confirmBooking(create(hotel("check_first", 0)), "b1").state).hold).toBeUndefined();
  });

  it("still refuses a request for a slot that is already taken when it is made", () => {
    const taken = hotel("check_first", 30, { bookings: [aBooking("other", { petId: "p2", cageId: "s1", checkIn: "2026-10-15", checkOut: "2026-10-16" })] });
    expect(upsertBooking(taken, stay).result).toEqual(["cage_taken"]);
  });

  it("refuses to confirm when the slot was taken meanwhile, and keeps the request", () => {
    let s = create(hotel("check_first"));
    // another booking takes the cage (a request holds nothing, so it may)
    s = { ...s, settings: { ...s.settings, payPolicy: { mode: "flexible", depositPercent: 30 } } };
    s = create(s, aBooking("b2", { petId: "p2", cageId: "s1", checkIn: "2026-10-16", checkOut: "2026-10-17" }));
    expect(find(s, "b2").hold).toBeUndefined();
    const out = confirmBooking(s, "b1");
    expect(out).toEqual({ state: s, result: ["full"] });
  });

  it("only confirms a request", () => {
    const s = create(hotel("flexible"));
    expect(confirmBooking(s, "b1").result).toEqual(["status"]);
    expect(confirmBooking(s, "nope").result).toEqual(["status"]);
  });

  it("does not show a request on the calendar, but does put it on the day's arrivals", () => {
    const s = create(hotel("check_first"));
    expect(calendarBars(s, "s1", "2026-10-10", 14)).toEqual([]);
    expect(todayBoard(s, "2026-10-14").arriving.map((b) => b.id)).toEqual(["b1"]);
  });

  it("a cancelled request waits for nothing", () => {
    const s = create(hotel("check_first"));
    const out = cancelBooking(s, "b1", { reason: "owner", refund: 0, method: "cash", on: "2026-10-12", at: "2026-10-12T10:00:00.000Z" });
    expect(find(out.state).status).toBe("cancelled");
    expect(find(out.state).hold).toBeUndefined();
  });

  it("works for a hotel without cages or rooms (one hidden pool unit)", () => {
    const pool = aSmallHotel({
      settings: { ...defaultSettings(), unitTerm: "none", payPolicy: { mode: "check_first", depositPercent: 50 } },
      cages: [poolCage(2, 60_000, "Shared area", "pool")],
      owners: [anOwner("o1"), anOwner("o2"), anOwner("o3")],
      pets: [aPet("p1", "o1"), aPet("p2", "o2"), aPet("p3", "o3")],
    });
    const a = aBooking("a", { petId: "p1", cageId: "pool", checkIn: "2026-11-01", checkOut: "2026-11-03", rate: 60_000 });
    const b = aBooking("b", { petId: "p2", cageId: "pool", checkIn: "2026-11-01", checkOut: "2026-11-03", rate: 60_000 });
    const c = aBooking("c", { petId: "p3", cageId: "pool", checkIn: "2026-11-01", checkOut: "2026-11-03", rate: 60_000 });
    let s = create(create(create(pool, a), b), c);
    // three requests for two places: none takes one yet
    expect(freePlaces(s, "pool", "2026-11-01", "2026-11-03")).toBe(2);
    s = confirmBooking(s, "a").state;
    s = confirmBooking(s, "b").state;
    expect(freePlaces(s, "pool", "2026-11-01", "2026-11-03")).toBe(0);
    expect(confirmBooking(s, "c").result).toEqual(["full"]);
    // 2 nights × Rp60.000 = Rp120.000; 50% is Rp60.000
    expect(find(s, "a").hold).toBe("deposit");
    s = recordPayment(s, "a", pay(60_000)).state;
    expect(checkInBooking(s, "a", null).result).toBe(true);
  });
});

describe("editing an existing booking", () => {
  it("keeps its hold whatever the caller sends: the policy only applies to new bookings", () => {
    const s = create(hotel("check_first"));
    const again = upsertBooking(s, { ...find(s), notes: "changed" });
    expect(find(again.state).hold).toBe("request");
    const flexible = upsertBooking(create(hotel("deposit_first")), { ...stay, notes: "x" });
    expect(find(flexible.state).hold).toBe("deposit");
    const sneaky = upsertBooking(create(hotel("flexible")), { ...stay, hold: "request" });
    expect(find(sneaky.state).hold).toBeUndefined();
  });
});

describe("the deposit percent setting", () => {
  it("takes a whole number from 0 to 100", () => {
    const at = (depositPercent: number) => ({ ...defaultSettings(), payPolicy: { mode: "deposit_first" as const, depositPercent } });
    expect(settingsIssues(at(30))).toEqual([]);
    for (const bad of [-1, 101, 12.5, NaN]) expect(settingsIssues(at(bad))).toEqual(["deposit"]);
    const s = aSmallHotel();
    expect(saveSettings(s, at(40)).state.settings.payPolicy).toEqual({ mode: "deposit_first", depositPercent: 40 });
    expect(saveSettings(s, at(140))).toEqual({ state: s, result: ["deposit"] });
  });
});
