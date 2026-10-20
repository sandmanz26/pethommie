// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sampleData } from "@/app/store/sampleData";
import { aBooking, aCage, aPet, aSmallHotel, anOwner } from "@/app/testing/fixtures";
import type { HotelData } from "@/app/domain/types";
import { fromRows, toRows, TABLES, type HotelRow, type Rows, type Table } from "./rows";

/**
 * The server's schema, run on a real Postgres (PGlite) with Supabase's pieces stubbed. It proves three things the
 * rest of the app relies on: the rows `toRows` makes are accepted and read back whole; the database itself refuses
 * what the app's rules refuse; and one hotel can't see or touch another's.
 */

const migration = readFileSync(fileURLToPath(new URL("../../../../backend/supabase/migrations/0001_init.sql", import.meta.url)), "utf8");

// What Supabase provides before any migration runs: the auth schema, auth.uid(), and the two API roles.
const SUPABASE_STUB = `
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create role anon nologin;
  create role authenticated nologin;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
`;

const ALICE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const BOB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CAROL = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const H1 = "11111111-1111-4111-8111-111111111111";
const H2 = "22222222-2222-4222-8222-222222222222";

let db: PGlite;

beforeAll(async () => {
  db = new PGlite({ extensions: { btree_gist } });
  await db.exec(SUPABASE_STUB);
  await db.exec(migration);
  await db.exec(`insert into auth.users (id, email) values ('${ALICE}', 'alice@example.com'), ('${BOB}', 'bob@example.com'), ('${CAROL}', 'carol@example.com')`);
}, 60_000);

afterAll(() => db.close());

/** Runs as a signed-in user (what the API does), or as the database owner when `user` is null. */
async function as<T>(user: string | null, run: () => Promise<T>): Promise<T> {
  if (user) {
    await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${user}', false)`);
  }
  try {
    return await run();
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false)`);
  }
}

const sql = (text: string, params: unknown[] = []) => db.query(text, params);
const refused = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (e) {
    return String((e as Error).message);
  }
  return null;
};

async function insertHotel(id: string, owner: string, hotel: Partial<HotelRow> = {}) {
  await sql("insert into hotels (id, name, city, whatsapp, created_by) values ($1, $2, $3, $4, $5)", [id, hotel.name ?? "Rumah Meong", hotel.city ?? "", hotel.whatsapp ?? "", owner]);
}

async function insertRows(rows: Rows) {
  for (const table of TABLES) {
    for (const row of rows[table] as Record<string, unknown>[]) {
      const cols = Object.keys(row);
      await sql(
        `insert into ${table} (${cols.join(", ")}) values (${cols.map((_, i) => `$${i + 1}`).join(", ")})`,
        cols.map((c) => (row[c] !== null && typeof row[c] === "object" ? JSON.stringify(row[c]) : row[c])),
      );
    }
  }
}

async function readRows(hotelId: string): Promise<{ hotel: HotelRow; rows: Rows }> {
  const hotel = (
    await sql(`select id, name, city, whatsapp, to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at from hotels where id = $1`, [hotelId])
  ).rows[0] as HotelRow;
  const pick = async (table: Table, columns: string) => (await sql(`select ${columns} from ${table} where hotel_id = $1 and deleted_at is null`, [hotelId])).rows;
  const ts = (c: string) => `to_char(${c} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as ${c}`;
  const day = (c: string) => `to_char(${c}, 'YYYY-MM-DD') as ${c}`;
  return {
    hotel,
    rows: {
      cages: (await pick("cages", "id, hotel_id, name, size, price_per_night")) as Rows["cages"],
      owners: (await pick("owners", "id, hotel_id, name, whatsapp")) as Rows["owners"],
      pets: (await pick("pets", `id, hotel_id, owner_id, name, species, breed, ${day("vaccine_expiry")}, notes`)) as Rows["pets"],
      bookings: (await pick("bookings", `id, hotel_id, pet_id, cage_id, ${day("check_in")}, ${day("check_out")}, status, arrival, notes, ${ts("created_at")}`)) as Rows["bookings"],
      payments: (await pick("payments", `id, hotel_id, booking_id, ${ts("paid_at")}, amount, method, note`)) as Rows["payments"],
      care_entries: (await pick("care_entries", `id, hotel_id, booking_id, ${ts("at")}, kind, preset, note`)) as Rows["care_entries"],
      reports_sent: (await pick("reports_sent", `hotel_id, booking_id, ${day("report_date")}, ${ts("sent_at")}`)) as Rows["reports_sent"],
    },
  };
}

describe("the schema holds what the app sends", () => {
  it("accepts the sample hotel's rows and gives the same hotel back", async () => {
    const data = sampleData();
    const { hotel, rows } = toRows(data, H1);
    await insertHotel(H1, ALICE, hotel);
    await insertRows(rows);
    const back = await readRows(H1);
    const sortPayments = (d: HotelData): HotelData => ({ ...d, bookings: d.bookings.map((b) => ({ ...b, payments: [...b.payments].sort((a, c) => a.at.localeCompare(c.at) || a.id.localeCompare(c.id)) })) });
    const sortBy = <T extends { id: string }>(list: T[]) => [...list].sort((a, b) => a.id.localeCompare(b.id));
    const restored = fromRows({ ...back.hotel, created_at: hotel.created_at }, back.rows);
    const expected = sortPayments(data);
    expect({ ...restored, cages: sortBy(restored.cages), owners: sortBy(restored.owners), pets: sortBy(restored.pets), bookings: sortBy(restored.bookings), careLog: sortBy(restored.careLog), reportsSent: restored.reportsSent.length }).toEqual({
      ...expected,
      cages: sortBy(expected.cages),
      owners: sortBy(expected.owners),
      pets: sortBy(expected.pets),
      bookings: sortBy(expected.bookings),
      careLog: sortBy(expected.careLog),
      reportsSent: expected.reportsSent.length,
    });
  });

  it("accepts a hotel made of old, hand-made ids", async () => {
    const data = aSmallHotel({
      bookings: [aBooking("b1", { petId: "p1", cageId: "s1", checkIn: "2026-10-14", checkOut: "2026-10-16", payments: [{ id: "pay1", at: "2026-10-14T08:00:00.000Z", amount: 5, method: "cash", note: "" }] })],
    });
    const { hotel, rows } = toRows(data, H2);
    await insertHotel(H2, BOB, hotel);
    await insertRows(rows);
    expect((await readRows(H2)).rows.bookings).toHaveLength(1);
  });
});

describe("the database refuses what the app refuses", () => {
  const H = "33333333-3333-4333-8333-333333333333";
  let rows: Rows;
  beforeAll(async () => {
    const data = aSmallHotel({
      cages: [aCage("s1"), aCage("s2")],
      owners: [anOwner("o1", "6281234567890")],
      pets: [aPet("p1", "o1"), aPet("p2", "o1")],
      bookings: [aBooking("b1", { petId: "p1", cageId: "s1", checkIn: "2026-11-10", checkOut: "2026-11-14" })],
    });
    const made = toRows(data, H);
    rows = made.rows;
    await insertHotel(H, ALICE, { name: "Test hotel" });
    await insertRows(made.rows);
  });

  const booking = (over: Record<string, unknown>) => {
    const b = { ...rows.bookings[0], id: crypto.randomUUID(), pet_id: rows.pets[1].id, ...over };
    return sql(
      "insert into bookings (id, hotel_id, pet_id, cage_id, check_in, check_out, status, arrival, notes) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
      [b.id, b.hotel_id, b.pet_id, b.cage_id, b.check_in, b.check_out, b.status, null, ""],
    );
  };

  it("won't double-book a cage", async () => {
    expect(await refused(booking({ check_in: "2026-11-12", check_out: "2026-11-16" }))).toMatch(/bookings_no_double_booking/);
    expect(await refused(booking({ check_in: "2026-11-09", check_out: "2026-11-11" }))).toMatch(/bookings_no_double_booking/);
  });

  it("lets a stay start the day another one ends, and use another cage", async () => {
    expect(await refused(booking({ check_in: "2026-11-14", check_out: "2026-11-16" }))).toBeNull();
    expect(await refused(booking({ cage_id: rows.cages[1].id, check_in: "2026-11-10", check_out: "2026-11-14" }))).toBeNull();
  });

  it("doesn't count a cancelled or finished stay", async () => {
    expect(await refused(booking({ check_in: "2026-11-11", check_out: "2026-11-13", status: "cancelled" }))).toBeNull();
    expect(await refused(booking({ check_in: "2026-11-11", check_out: "2026-11-13", status: "checked_out" }))).toBeNull();
  });

  it("frees the cage once the stay is cancelled", async () => {
    await sql("update bookings set status = 'cancelled' where id = $1", [rows.bookings[0].id]);
    expect(await refused(booking({ check_in: "2026-11-12", check_out: "2026-11-13" }))).toBeNull();
  });

  it("refuses check-out on or before check-in, bad statuses, and impossible money", async () => {
    expect(await refused(booking({ check_in: "2026-12-05", check_out: "2026-12-05" }))).toMatch(/check/i);
    expect(await refused(booking({ check_in: "2026-12-05", check_out: "2026-12-06", status: "lost" }))).toMatch(/check/i);
    const pay = (amount: number, method = "cash") =>
      sql("insert into payments (id, hotel_id, booking_id, paid_at, amount, method) values ($1,$2,$3,now(),$4,$5)", [crypto.randomUUID(), H, rows.bookings[0].id, amount, method]);
    expect(await refused(pay(0))).toMatch(/check/i);
    expect(await refused(pay(-5))).toMatch(/check/i);
    expect(await refused(pay(5, "bitcoin"))).toMatch(/check/i);
    expect(await refused(pay(5))).toBeNull();
  });

  it("refuses a log entry of a kind that doesn't exist, and a malformed WhatsApp number", async () => {
    expect(await refused(sql("insert into care_entries (id, hotel_id, booking_id, at, kind) values ($1,$2,$3,now(),'nap')", [crypto.randomUUID(), H, rows.bookings[0].id]))).toMatch(/check/i);
    expect(await refused(sql("insert into owners (id, hotel_id, name, whatsapp) values ($1,$2,'X','0812')", [crypto.randomUUID(), H]))).toMatch(/check/i);
  });

  it("won't let a record point at another hotel's record", async () => {
    await insertHotel("44444444-4444-4444-8444-444444444444", BOB, { name: "Other" });
    const err = await refused(
      sql("insert into pets (id, hotel_id, owner_id, name, species) values ($1, $2, $3, 'Spy', 'cat')", [crypto.randomUUID(), "44444444-4444-4444-8444-444444444444", rows.owners[0].id]),
    );
    expect(err).toMatch(/foreign key|violates/i);
  });

  it("stamps updated_at when a row changes, for sync", async () => {
    const before = (await sql("select updated_at from cages where id = $1", [rows.cages[0].id])).rows[0] as { updated_at: Date };
    await sql("select pg_sleep(0.01)");
    await sql("update cages set price_per_night = 60000 where id = $1", [rows.cages[0].id]);
    const after = (await sql("select updated_at from cages where id = $1", [rows.cages[0].id])).rows[0] as { updated_at: Date };
    expect(after.updated_at.getTime()).toBeGreaterThan(before.updated_at.getTime());
  });
});

describe("each hotel sees only its own", () => {
  const A = "55555555-5555-4555-8555-555555555555";
  const B = "66666666-6666-4666-8666-666666666666";

  it("makes whoever creates a hotel its owner", async () => {
    await as(ALICE, async () => {
      await sql("insert into hotels (id, name, created_by) values ($1, 'Alice Inn', $2)", [A, ALICE]);
    });
    const m = (await sql("select user_id, role from hotel_members where hotel_id = $1", [A])).rows;
    expect(m).toEqual([{ user_id: ALICE, role: "owner" }]);
  });

  it("won't let someone create a hotel in another person's name", async () => {
    const err = await as(BOB, () => refused(sql("insert into hotels (id, name, created_by) values ($1, 'Fake', $2)", [crypto.randomUUID(), ALICE])));
    expect(err).toMatch(/row-level security/i);
  });

  it("shows a member their hotel's records, and a stranger nothing", async () => {
    await as(BOB, async () => {
      await sql("insert into hotels (id, name, created_by) values ($1, 'Bob Inn', $2)", [B, BOB]);
      await sql("insert into cages (id, hotel_id, name, size, price_per_night) values ($1, $2, 'S1', 'S', 1000)", [crypto.randomUUID(), B]);
    });
    const alice = await as(ALICE, async () => ({
      hotels: (await sql("select name from hotels order by name")).rows.map((r) => (r as { name: string }).name),
      cages: (await sql("select hotel_id from cages")).rows.map((r) => (r as { hotel_id: string }).hotel_id),
    }));
    expect(alice.hotels).not.toContain("Bob Inn");
    expect(alice.cages).not.toContain(B);
  });

  it("won't let a stranger write into, change or delete another hotel's records", async () => {
    const write = await as(ALICE, () => refused(sql("insert into cages (id, hotel_id, name, size, price_per_night) values ($1, $2, 'Intruder', 'S', 1)", [crypto.randomUUID(), B])));
    expect(write).toMatch(/row-level security/i);
    const changed = await as(ALICE, async () => (await sql("update cages set price_per_night = 1 where hotel_id = $1", [B])).affectedRows);
    expect(changed).toBe(0);
    const removed = await as(ALICE, async () => (await sql("delete from cages where hotel_id = $1", [B])).affectedRows);
    expect(removed).toBe(0);
    expect(((await sql("select count(*)::int as n from cages where hotel_id = $1", [B])).rows[0] as { n: number }).n).toBe(1);
  });

  it("lets only an owner add staff, and staff can work but not manage", async () => {
    await as(BOB, () => sql("insert into hotel_members (hotel_id, user_id, role) values ($1, $2, 'staff')", [B, ALICE]));
    const staffRead = await as(ALICE, async () => (await sql("select count(*)::int as n from cages where hotel_id = $1", [B])).rows[0] as { n: number });
    expect(staffRead.n).toBe(1);
    const staffAdds = await as(ALICE, () => refused(sql("insert into hotel_members (hotel_id, user_id, role) values ($1, $2, 'staff')", [B, CAROL])));
    expect(staffAdds).toMatch(/row-level security/i);
    const staffPromotes = await as(ALICE, async () => (await sql("update hotel_members set role = 'owner' where hotel_id = $1 and user_id = $2", [B, ALICE])).affectedRows);
    expect(staffPromotes).toBe(0);
    const staffDeletesHotel = await as(ALICE, async () => (await sql("delete from hotels where id = $1", [B])).affectedRows);
    expect(staffDeletesHotel).toBe(0);
  });

  it("is closed to anyone who isn't signed in", async () => {
    await db.exec("set role anon");
    try {
      expect(await refused(sql("select * from hotels"))).toMatch(/permission denied/i);
      expect(await refused(sql("select * from cages"))).toMatch(/permission denied/i);
    } finally {
      await db.exec("reset role");
    }
  });
});

describe("the sign-up list", () => {
  const join = (over: Record<string, string> = {}) => {
    const r = { hotel_name: "Rumah Meong", city: "Bintaro", cages: "15 to 50", whatsapp: "6281234567890", ...over };
    return sql("insert into join_requests (hotel_name, city, cages, whatsapp) values ($1,$2,$3,$4)", [r.hotel_name, r.city, r.cages, r.whatsapp]);
  };

  it("takes a sign-up from a visitor who isn't signed in, but lets nobody read them back", async () => {
    await db.exec("set role anon");
    try {
      expect(await refused(join())).toBeNull();
      expect(await refused(sql("select * from join_requests"))).toMatch(/permission denied/i);
    } finally {
      await db.exec("reset role");
    }
    expect(((await sql("select count(*)::int as n from join_requests")).rows[0] as { n: number }).n).toBe(1);
  });

  it("refuses an empty name or a number that isn't a WhatsApp number", async () => {
    expect(await refused(join({ hotel_name: "  " }))).toMatch(/check/i);
    expect(await refused(join({ whatsapp: "0812" }))).toMatch(/check/i);
  });

  it("isn't readable by signed-in users either", async () => {
    const err = await as(ALICE, () => refused(sql("select * from join_requests")));
    expect(err).toMatch(/permission denied/i);
  });
});
