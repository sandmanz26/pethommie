import { beforeEach, describe, expect, it } from "vitest";
import { upsertBooking, upsertCage } from "@/app/store/actions";
import { aBooking, aCage, aSmallHotel } from "@/app/testing/fixtures";
import { emptyData, type HotelData } from "@/app/domain/types";
import { createMemoryGateway } from "./gateway";
import { toRows, type Rows } from "./rows";
import { createSyncedRepository, syncMetaKeyFor, type SyncedRepository } from "./syncedRepository";

const HOTEL = "0d5e1f00-0000-4000-8000-000000000001";
const serverHotel = () => toRows(aSmallHotel(), HOTEL).hotel;

/** One device: its repository, and what the store would hold (the last thing loaded, saved or pushed to it). */
function device(key: string, gateway: ReturnType<typeof createMemoryGateway>, hotelId: string | null = HOTEL) {
  const repo: SyncedRepository = createSyncedRepository({ key, gateway, hotelId, debounceMs: null });
  let data = repo.load();
  repo.subscribe((next) => (data = next));
  return {
    repo,
    data: () => data,
    change(fn: (d: HotelData) => HotelData) {
      data = fn(data);
      repo.save(data);
    },
  };
}

const sorted = (rows: Rows) =>
  Object.fromEntries(Object.entries(rows).map(([t, list]) => [t, [...(list as Record<string, unknown>[])].map((r) => JSON.stringify(r)).sort()]));
const sameHotel = (a: HotelData, b: HotelData) => expect(sorted(toRows(a, HOTEL).rows)).toEqual(sorted(toRows(b, HOTEL).rows));

beforeEach(() => localStorage.clear());

describe("a hotel kept on the device and on the server", () => {
  it("works through a day offline and sends it all when the connection comes back", async () => {
    const gateway = createMemoryGateway(serverHotel());
    const a = device("a", gateway);
    gateway.offline(true);
    a.change(() => aSmallHotel());
    a.change((d) => upsertCage(d, aCage("l1", "L", 120_000)));
    a.change((d) => upsertBooking(d, aBooking("b1", { petId: "p1", cageId: "s1", checkIn: "2026-10-14", checkOut: "2026-10-16" })).state);
    await a.repo.sync();
    expect(a.repo.status()).toEqual({ state: "offline" });
    expect(gateway.rows().cages).toHaveLength(0);

    // The tab is closed and opened again: the outbox is still there.
    expect(localStorage.getItem(syncMetaKeyFor("a"))).toContain("120000");
    const again = device("a", gateway);
    gateway.offline(false);
    await again.repo.sync();
    expect(again.repo.status()).toMatchObject({ state: "synced" });
    expect(gateway.rows().cages).toHaveLength(4);
    expect(gateway.rows().bookings).toHaveLength(1);
    expect(gateway.hotel()?.name).toBe("Rumah Meong");
  });

  it("brings two devices to the same hotel, also when both changed it meanwhile", async () => {
    const gateway = createMemoryGateway(serverHotel());
    const a = device("a", gateway);
    const b = device("b", gateway);
    a.change(() => aSmallHotel());
    await a.repo.sync();
    await b.repo.sync();
    expect(b.data().hotel?.name).toBe("Rumah Meong");
    sameHotel(b.data(), a.data());

    // Both work without syncing: A adds a unit, B books a stay. B is behind when it pushes: it pulls, then pushes.
    a.change((d) => upsertCage(d, aCage("l1", "L", 120_000)));
    b.change((d) => upsertBooking(d, aBooking("b1", { petId: toRows(d, HOTEL).rows.pets[0].id, cageId: toRows(d, HOTEL).rows.cages[0].id, checkIn: "2026-10-14", checkOut: "2026-10-16" })).state);
    await a.repo.sync();
    await b.repo.sync();
    await a.repo.sync();
    expect(a.repo.status()).toMatchObject({ state: "synced" });
    expect(b.repo.status()).toMatchObject({ state: "synced" });
    sameHotel(a.data(), b.data());
    expect(a.data().cages).toHaveLength(4);
    expect(a.data().bookings).toHaveLength(1);
  });

  it("shows a double booking from another device as a conflict, and keeps the stay until it is moved", async () => {
    const gateway = createMemoryGateway(serverHotel());
    const a = device("a", gateway);
    const b = device("b", gateway);
    a.change(() => aSmallHotel());
    await a.repo.sync();
    await b.repo.sync();
    const [cage, other] = a.data().cages;
    const [p1, p2] = a.data().pets;
    a.change((d) => upsertBooking(d, aBooking("ba", { petId: p1.id, cageId: cage.id, checkIn: "2026-10-14", checkOut: "2026-10-16" })).state);
    b.change((d) => upsertBooking(d, aBooking("bb", { petId: p2.id, cageId: cage.id, checkIn: "2026-10-15", checkOut: "2026-10-17" })).state);
    await a.repo.sync();
    await b.repo.sync();

    expect(b.repo.status()).toMatchObject({ state: "conflict", reason: "double_booking", booking: toRows(b.data(), HOTEL).rows.bookings.find((r) => r.check_in === "2026-10-15")!.id });
    // Nothing dropped: B still has its stay (and now A's too), and it is still waiting to go.
    expect(b.data().bookings.map((x) => x.checkIn).sort()).toEqual(["2026-10-14", "2026-10-15"]);
    expect(localStorage.getItem(syncMetaKeyFor("b"))).toContain("2026-10-15");

    // The operator moves the stay to the other unit: it goes through.
    b.change((d) => ({ ...d, bookings: d.bookings.map((x) => (x.checkIn === "2026-10-15" ? { ...x, cageId: other.id } : x)) }));
    await b.repo.sync();
    await a.repo.sync();
    expect(b.repo.status()).toMatchObject({ state: "synced" });
    sameHotel(a.data(), b.data());
  });

  it("makes the hotel on the server the first time, once onboarding has made it here, and uploads what is here", async () => {
    const gateway = createMemoryGateway(serverHotel(), { exists: false });
    const a = device("a", gateway, null);
    await a.repo.sync();
    expect(a.repo.status()).toEqual({ state: "pending" });
    expect(gateway.hotel()).toBeNull();

    a.change(() => aSmallHotel());
    await a.repo.sync();
    expect(gateway.hotel()?.name).toBe("Rumah Meong");
    expect(a.repo.hotelId()).toBe(gateway.hotel()?.id);
    expect(gateway.rows().pets).toHaveLength(2);
    expect(a.repo.status()).toMatchObject({ state: "synced" });

    // Another device of the same person finds it and gets everything.
    const b = device("b", gateway, null);
    expect(b.data()).toEqual(emptyData());
    await b.repo.sync();
    expect(b.data().hotel?.name).toBe("Rumah Meong");
    expect(b.data().pets).toHaveLength(2);
  });
});
