import { beforeEach, describe, expect, it, vi } from "vitest";
import { upsertBooking, upsertCage } from "@/app/store/actions";
import { aBooking, aCage, aSmallHotel } from "@/app/testing/fixtures";
import { emptyData, type HotelData } from "@/app/domain/types";
import { createMemoryGateway } from "./gateway";
import { toRows, type Rows } from "./rows";
import { createSyncedRepository, setAsideKeyFor, syncMetaKeyFor, type SyncedRepository } from "./syncedRepository";

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

describe("a device that doesn't have the hotel yet", () => {
  /** The person's hotel on the server, made and filled by their first device. */
  async function serverWithHotel() {
    const gateway = createMemoryGateway(serverHotel());
    const first = device("first", gateway);
    first.change(() => aSmallHotel());
    await first.repo.sync();
    return { gateway, first };
  }

  it("waits for the server before saying there is nothing to show, then has the person's hotel", async () => {
    const { gateway } = await serverWithHotel();
    const create = vi.spyOn(gateway, "createHotel");
    const b = device("b", gateway, null);
    expect(b.data().hotel).toBeNull();
    expect(b.repo.arrival()).toBe("waiting");

    const seen: string[] = [];
    b.repo.onArrival((a) => seen.push(`${a}:${b.data().hotel?.name ?? "-"}`));
    await b.repo.sync();
    // The hotel is in the store before it is said to be here, so the app never sees "ready" without it.
    expect(seen).toEqual(["ready:Rumah Meong"]);
    expect(b.data().pets).toHaveLength(2);
    expect(create).not.toHaveBeenCalled();
  });

  it("says there is no hotel only when the server says so", async () => {
    const gateway = createMemoryGateway(serverHotel(), { exists: false });
    const a = device("a", gateway, null);
    expect(a.repo.arrival()).toBe("waiting");
    await a.repo.sync();
    expect(a.repo.arrival()).toBe("none");
    a.change(() => aSmallHotel());
    expect(a.repo.arrival()).toBe("ready");
  });

  it("offline on a first sign-in: unreachable, and fetched once the connection is back", async () => {
    const { gateway } = await serverWithHotel();
    const b = device("b", gateway, null);
    gateway.offline(true);
    await b.repo.sync();
    expect(b.repo.arrival()).toBe("unreachable");
    expect(b.repo.status()).toEqual({ state: "offline" });
    expect(b.data().hotel).toBeNull();

    gateway.offline(false);
    const retrying = b.repo.sync();
    expect(b.repo.arrival()).toBe("waiting");
    await retrying;
    expect(b.repo.arrival()).toBe("ready");
    expect(b.data().hotel?.name).toBe("Rumah Meong");
  });

  it("a device that was set up anyway while the server had a hotel takes the server's, and keeps its own aside", async () => {
    const { gateway, first } = await serverWithHotel();
    const create = vi.spyOn(gateway, "createHotel");
    const before = { rows: sorted(gateway.rows()), hotel: gateway.hotel() };

    // A second phone ran through onboarding before it heard from the server.
    const b = device("b", gateway, null);
    const ownSetup = aSmallHotel({ hotel: { name: "Typed on the phone", city: "", whatsapp: "", createdAt: "2026-11-01T00:00:00.000Z" }, cages: [aCage("x1"), aCage("x2")] });
    b.change(() => ownSetup);
    await b.repo.sync();

    // Not a second hotel, not renamed, no second set of units: the server is as it was.
    expect(create).not.toHaveBeenCalled();
    expect(b.repo.hotelId()).toBe(HOTEL);
    expect(gateway.hotel()).toEqual(before.hotel);
    expect(sorted(gateway.rows())).toEqual(before.rows);
    // The phone now shows the person's hotel, and what was typed there is kept aside, not lost.
    expect(b.data().hotel?.name).toBe("Rumah Meong");
    sameHotel(b.data(), first.data());
    expect(JSON.parse(localStorage.getItem(setAsideKeyFor("b")) ?? "null")?.hotel?.name).toBe("Typed on the phone");
    expect(b.repo.status()).toMatchObject({ state: "synced" });

    // And it syncs normally from then on.
    b.change((d) => upsertCage(d, aCage("l1", "L", 120_000)));
    await b.repo.sync();
    await first.repo.sync();
    expect(first.data().cages).toHaveLength(4);
  });

  it("a hotel whose creation answer was lost is still its own when asked again (no second hotel, nothing set aside)", async () => {
    const gateway = createMemoryGateway(serverHotel(), { exists: false });
    const create = gateway.createHotel;
    let lose = true;
    gateway.createHotel = async (row) => {
      const id = await create(row);
      if (lose) throw new TypeError("Failed to fetch");
      return id;
    };
    const a = device("a", gateway, null);
    a.change(() => aSmallHotel());
    await a.repo.sync();
    expect(a.repo.status()).toEqual({ state: "offline" });
    lose = false;
    await a.repo.sync();
    expect(a.repo.hotelId()).toBe(gateway.hotel()?.id);
    expect(gateway.rows().pets).toHaveLength(2);
    expect(localStorage.getItem(setAsideKeyFor("a"))).toBeNull();
  });
});

describe("deleting a synced hotel", () => {
  async function twoDevices() {
    const gateway = createMemoryGateway(serverHotel());
    const a = device("a", gateway);
    const b = device("b", gateway);
    a.change(() => aSmallHotel());
    a.change((d) => upsertBooking(d, aBooking("b1", { petId: "p1", cageId: "s1", checkIn: "2026-10-14", checkOut: "2026-10-16" })).state);
    await a.repo.sync();
    await b.repo.sync();
    return { gateway, a, b };
  }

  it("everywhere: what the app's reset does (clear, then the empty hotel) removes every row on the server and on the other devices", async () => {
    const { gateway, a, b } = await twoDevices();
    expect(gateway.rows().bookings).toHaveLength(1);

    a.repo.clear();
    a.change(() => emptyData());
    expect(a.repo.arrival()).toBe("none");
    await a.repo.sync();
    for (const list of Object.values(gateway.rows())) expect(list).toEqual([]);
    // The server's hotel row doesn't bring the hotel back here: this device sets it up again.
    expect(a.data().hotel).toBeNull();
    expect(a.repo.arrival()).toBe("none");
    // Reopened, it still knows.
    expect(device("a", gateway).repo.arrival()).toBe("none");

    await b.repo.sync();
    expect(b.data().cages).toEqual([]);
    expect(b.data().bookings).toEqual([]);

    // Set up again: the same hotel on the server, renamed, not a second one.
    a.change(() => aSmallHotel({ hotel: { name: "Rumah Meong Baru", city: "", whatsapp: "", createdAt: "2026-11-04T00:00:00.000Z" } }));
    await a.repo.sync();
    await b.repo.sync();
    expect(gateway.hotel()).toMatchObject({ id: HOTEL, name: "Rumah Meong Baru" });
    expect(b.data().hotel?.name).toBe("Rumah Meong Baru");
    expect(b.data().cages).toHaveLength(3);
  });

  it("this device only: the local copy and its unsent changes go, the server keeps everything, and it comes back on the next sign-in", async () => {
    const { gateway, a } = await twoDevices();
    const onServer = sorted(gateway.rows());
    gateway.offline(true);
    a.change((d) => upsertCage(d, aCage("l1", "L", 120_000)));
    await a.repo.sync();
    expect(a.repo.unsent()).toBe(1);

    a.repo.forget();
    expect(localStorage.getItem("a")).toBeNull();
    expect(localStorage.getItem(syncMetaKeyFor("a"))).toBeNull();
    // Nothing more is written or sent by this repository, even if the app saves once more on its way out.
    a.repo.save(aSmallHotel());
    gateway.offline(false);
    await a.repo.sync();
    expect(localStorage.getItem("a")).toBeNull();
    expect(sorted(gateway.rows())).toEqual(onServer);

    // Signed in again: nothing here, so it waits for the server and gets the hotel back.
    const again = device("a", gateway, null);
    expect(again.repo.arrival()).toBe("waiting");
    await again.repo.sync();
    expect(again.data().hotel?.name).toBe("Rumah Meong");
    expect(again.data().bookings).toHaveLength(1);
    expect(again.data().cages).toHaveLength(3);
  });
});
