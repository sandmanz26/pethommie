// @vitest-environment node
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getBookings, postBooking } from "../_lib/handlers/bookings.js";
import { getCages } from "../_lib/handlers/cages.js";
import { getHealth } from "../_lib/handlers/health.js";
import { getHotel, postHotel } from "../_lib/handlers/hotel.js";
import { postJoin } from "../_lib/handlers/join.js";
import { getOwners, postOwner } from "../_lib/handlers/owners.js";
import { getPets, postPet } from "../_lib/handlers/pets.js";
import { ApiError, MAX_BODY_BYTES } from "../_lib/http.js";
import { RateLimiter } from "../_lib/rateLimit.js";
import { route, type Handler } from "../_lib/route.js";
import { readEnv } from "../_lib/env.js";
import { ALICE, fakeSupabase, has, HOTEL, member, NEW_ID, request, testDeps, TOKEN, type Responder } from "./fakeSupabase.js";

const users = { [TOKEN]: ALICE };
const PET = "22222222-2222-4222-8222-222222222222";
const CAGE = "33333333-3333-4333-8333-333333333333";
const OWNER = "44444444-4444-4444-8444-444444444444";

/** Runs a handler the way Vercel would (errors become JSON), with a fake database. */
async function call(handler: Handler, req: Request, respond: Responder = member(), over: Parameters<typeof testDeps>[1] = {}) {
  const fake = fakeSupabase({ users, respond });
  const res = await route(handler, () => testDeps(fake, over))(req);
  return { res, status: res.status, body: (await res.json()) as Record<string, any>, fake }; // eslint-disable-line @typescript-eslint/no-explicit-any
}

afterEach(() => vi.unstubAllEnvs());

describe("every endpoint answers in JSON", () => {
  it("errors share one shape and are never cached", async () => {
    const { res, status, body } = await call(getHotel, request("GET", "/api/hotel", { token: null }));
    expect(status).toBe(401);
    expect(body).toEqual({ error: { code: "missing_token", message: expect.any(String) } });
    expect(res.headers.get("content-type")).toMatch(/application\/json/);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("an unexpected failure is a 500 that tells nothing about the server", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const boom: Handler = async () => {
      throw new Error("secret detail");
    };
    const { status, body } = await call(boom, request("GET", "/api/x"));
    expect(status).toBe(500);
    expect(JSON.stringify(body)).not.toContain("secret");
    expect(spy).toHaveBeenCalled();
  });

  it("without the Supabase settings: 503 not_configured", async () => {
    const { status, body } = await call(getHotel, request("GET", "/api/hotel"), member(), { env: {} });
    expect(status).toBe(503);
    expect(body.error.code).toBe("not_configured");
  });

  it("reads SUPABASE_* first and falls back to the app's VITE_* values", () => {
    expect(readEnv({ VITE_SUPABASE_URL: "https://a.supabase.co/", VITE_SUPABASE_ANON_KEY: "k" })).toEqual({ supabaseUrl: "https://a.supabase.co", anonKey: "k" });
    expect(readEnv({ SUPABASE_URL: "https://b.supabase.co", VITE_SUPABASE_URL: "https://a.supabase.co", SUPABASE_ANON_KEY: "s" })).toEqual({ supabaseUrl: "https://b.supabase.co", anonKey: "s" });
  });

  it("bad bodies: not JSON 400, wrong type 415, too big 413", async () => {
    const post = (body: string, type = "application/json") => call(postOwner, request("POST", "/api/owners", { body, headers: { "content-type": type } }));
    expect((await post("{nope")).body.error.code).toBe("bad_json");
    expect((await post("[1]")).status).toBe(400);
    expect((await post("name=x", "text/plain")).status).toBe(415);
    expect((await post(JSON.stringify({ name: "x".repeat(MAX_BODY_BYTES) }))).status).toBe(413);
  });
});

describe("sign-in", () => {
  it("passes the person's own token to Supabase, so row level security applies", async () => {
    const { status, fake } = await call(getOwners, request("GET", "/api/owners"));
    expect(status).toBe(200);
    expect(fake.tokens).toEqual([TOKEN]);
    expect(fake.calls.every((c) => c.token === TOKEN)).toBe(true);
  });

  it("refuses a token Supabase doesn't know, and a malformed header", async () => {
    expect((await call(getOwners, request("GET", "/api/owners", { token: "stolen" }))).body.error.code).toBe("invalid_token");
    const { body } = await call(getOwners, request("GET", "/api/owners", { token: null, headers: { authorization: "Basic abc" } }));
    expect(body.error.code).toBe("missing_token");
  });

  it("an account without a hotel: 404 no_hotel", async () => {
    const { status, body } = await call(getOwners, request("GET", "/api/owners"), () => undefined);
    expect(status).toBe(404);
    expect(body.error.code).toBe("no_hotel");
  });
});

describe("GET /api/health", () => {
  it("is fine when the settings are there and Supabase answers", async () => {
    const fetch = vi.fn(async () => new Response("{}", { status: 200 }));
    const { status, body } = await call(getHealth, request("GET", "/api/health", { token: null }), undefined, { fetch });
    expect(status).toBe(200);
    expect(body).toMatchObject({ ok: true, env: { SUPABASE_URL: true, SUPABASE_ANON_KEY: true }, supabase: { reachable: true, status: 200 } });
    expect(fetch).toHaveBeenCalledWith("https://demo.supabase.co/auth/v1/health", expect.objectContaining({ headers: { apikey: "anon-key" } }));
    expect(JSON.stringify(body)).not.toContain("anon-key");
  });

  it("says what is wrong otherwise", async () => {
    const health = (over: Parameters<typeof testDeps>[1]) => call(getHealth, request("GET", "/api/health", { token: null }), undefined, over);
    expect((await health({ env: { anonKey: "k" } })).body).toMatchObject({ ok: false, env: { SUPABASE_URL: false, SUPABASE_ANON_KEY: true } });
    expect((await health({ fetch: async () => new Response("", { status: 401 }) })).body.supabase.reason).toBe("anon_key_rejected");
    const down = await health({ fetch: async () => Promise.reject(new TypeError("fetch failed")) });
    expect(down.status).toBe(503);
    expect(down.body.supabase.reason).toBe("network_error");
  });
});

describe("/api/hotel", () => {
  const hotelRow = { id: HOTEL, name: "Rumah Meong", city: "Bandung", whatsapp: "6281234567890", settings: {}, created_at: "2026-11-01T00:00:00Z" };
  const db: Responder = (c) => (c.table === "hotels" ? { data: hotelRow } : c.table === "hotel_members" ? { data: { role: "owner" } } : undefined);

  it("GET: the hotel and the person's role", async () => {
    const { status, body } = await call(getHotel, request("GET", "/api/hotel"), member(db));
    expect(status).toBe(200);
    expect(body).toEqual({ hotel: { id: HOTEL, name: "Rumah Meong", city: "Bandung", whatsapp: "6281234567890", settings: {}, createdAt: "2026-11-01T00:00:00Z" }, role: "owner" });
  });

  it("POST: makes the hotel through create_hotel, with a normalised WhatsApp number", async () => {
    let made = false;
    const respond: Responder = (c) => {
      if (c.rpc === "my_hotel") return { data: made ? HOTEL : null };
      if (c.rpc === "create_hotel") {
        made = true;
        return { data: NEW_ID };
      }
      return db(c);
    };
    const { status, fake } = await call(postHotel, request("POST", "/api/hotel", { body: { name: " Rumah Meong ", city: "Bandung", whatsapp: "0812-3456-7890" } }), respond);
    expect(status).toBe(201);
    expect(fake.calls.find((c) => c.rpc === "create_hotel")?.args).toEqual({ p_id: NEW_ID, p_name: "Rumah Meong", p_city: "Bandung", p_whatsapp: "6281234567890", p_settings: {} });
  });

  it("POST: one hotel per account, and a name is required", async () => {
    expect((await call(postHotel, request("POST", "/api/hotel", { body: { name: "Dua" } }), member(db))).body.error.code).toBe("hotel_exists");
    const { status, body } = await call(postHotel, request("POST", "/api/hotel", { body: { name: "  ", whatsapp: "12" } }), () => undefined);
    expect(status).toBe(422);
    expect(Object.keys(body.error.fields)).toEqual(["name", "whatsapp"]);
  });

  it("POST: an id that is someone else's hotel is refused", async () => {
    const respond: Responder = (c) => (c.rpc === "create_hotel" ? { error: { code: "42501", message: "that hotel belongs to someone else" } } : undefined);
    const { status } = await call(postHotel, request("POST", "/api/hotel", { body: { name: "X", id: HOTEL } }), respond);
    expect(status).toBe(403);
  });
});

describe("/api/owners and /api/pets", () => {
  it("GET owners: only the hotel's, not removed ones", async () => {
    const row = { id: OWNER, name: "Sari", whatsapp: "", language: "id", created_at: "c", updated_at: "u" };
    const { body, fake } = await call(getOwners, request("GET", "/api/owners"), member(() => ({ data: [row] })));
    expect(body.owners).toEqual([{ id: OWNER, name: "Sari", whatsapp: "", language: "id", createdAt: "c", updatedAt: "u" }]);
    const q = fake.calls.find((c) => c.table === "owners")!;
    expect(has(q, "eq", "hotel_id", HOTEL) && has(q, "is", "deleted_at", null)).toBe(true);
  });

  it("POST owner: validated, then inserted into the hotel", async () => {
    const bad = await call(postOwner, request("POST", "/api/owners", { body: { name: "Sari", whatsapp: "021 555", language: "fr" } }));
    expect(Object.keys(bad.body.error.fields)).toEqual(["whatsapp", "language"]);
    const { status, fake } = await call(postOwner, request("POST", "/api/owners", { body: { name: "Sari", whatsapp: "+62 812 3456 7890" } }), member((c) => (c.op === "insert" ? { data: { id: NEW_ID } } : undefined)));
    expect(status).toBe(201);
    expect(fake.calls.find((c) => c.op === "insert")?.payload).toEqual({ id: NEW_ID, hotel_id: HOTEL, name: "Sari", whatsapp: "6281234567890", language: "id" });
  });

  it("GET pets: by owner with ?ownerId, which must be an id", async () => {
    const { fake } = await call(getPets, request("GET", `/api/pets?ownerId=${OWNER}`), member(() => ({ data: [] })));
    expect(has(fake.calls.find((c) => c.table === "pets")!, "eq", "owner_id", OWNER)).toBe(true);
    expect((await call(getPets, request("GET", "/api/pets?ownerId=7"))).status).toBe(422);
  });

  it("POST pet: the owner must be one of the hotel's", async () => {
    const body = { ownerId: OWNER, name: "Mochi", species: "cat", vaccineExpiry: "2027-02-30" };
    const bad = await call(postPet, request("POST", "/api/pets", { body }));
    expect(bad.body.error.fields).toEqual({ vaccineExpiry: expect.any(String) });
    const unknown = await call(postPet, request("POST", "/api/pets", { body: { ...body, vaccineExpiry: "2027-02-28" } }));
    expect(unknown.body.error.fields).toEqual({ ownerId: "is not an owner of your hotel" });
    const pet = { id: NEW_ID, owner_id: OWNER, name: "Mochi", species: "cat", breed: "", vaccine_expiry: "2027-02-28", notes: "", created_at: "c", updated_at: "u" };
    const ok = await call(postPet, request("POST", "/api/pets", { body: { ...body, vaccineExpiry: "2027-02-28" } }), member((c) => (c.table === "owners" ? { data: { id: OWNER } } : c.op === "insert" ? { data: pet } : undefined)));
    expect(ok.status).toBe(201);
    expect(ok.body.pet).toMatchObject({ id: NEW_ID, ownerId: OWNER, vaccineExpiry: "2027-02-28" });
  });

  it("GET cages", async () => {
    const { body } = await call(getCages, request("GET", "/api/cages"), member(() => ({ data: [{ id: CAGE, name: "A1", size: "M", price_per_night: 75000, capacity: 1, archived: false }] })));
    expect(body.cages).toEqual([{ id: CAGE, name: "A1", size: "M", pricePerNight: 75000, capacity: 1, archived: false }]);
  });
});

describe("/api/bookings", () => {
  it("GET: stays overlapping the window, from today in Jakarta for 31 days by default", async () => {
    const { status, body, fake } = await call(getBookings, request("GET", "/api/bookings"), member(() => ({ data: [] })));
    expect(status).toBe(200);
    expect(body).toEqual({ from: "2026-11-04", to: "2026-12-05", bookings: [] });
    const q = fake.calls.find((c) => c.table === "bookings")!;
    expect(has(q, "lt", "check_in", "2026-12-05") && has(q, "gt", "check_out", "2026-11-04") && has(q, "is", "deleted_at", null)).toBe(true);
  });

  it("GET: from/to and status are checked", async () => {
    const get = (qs: string) => call(getBookings, request("GET", `/api/bookings?${qs}`), member(() => ({ data: [] })));
    expect((await get("from=2026-12-01&to=2026-12-01")).body.error.fields).toEqual({ to: "must be after from" });
    expect((await get("from=2026-01-01&to=2027-06-01")).status).toBe(422);
    expect((await get("from=yesterday")).status).toBe(422);
    expect((await get("status=lost")).status).toBe(422);
    expect((await get("from=2026-12-01&to=2026-12-08&status=booked")).status).toBe(200);
  });

  const good = { petId: PET, cageId: CAGE, checkIn: "2026-12-20", checkOut: "2026-12-23", source: "whatsapp" };
  const unitsAndPets =
    (insert: Responder = () => ({ data: { id: NEW_ID } }), cage: Record<string, unknown> = { id: CAGE, price_per_night: 75000, archived: false }): Responder =>
    (c) =>
      c.op === "insert" ? insert(c) : c.table === "cages" ? { data: cage } : c.table === "pets" ? { data: { id: PET } } : undefined;

  it("POST: books the stay at the unit's price", async () => {
    const { status, fake } = await call(postBooking, request("POST", "/api/bookings", { body: good }), member(unitsAndPets()));
    expect(status).toBe(201);
    expect(fake.calls.find((c) => c.op === "insert")?.payload).toEqual({
      id: NEW_ID, hotel_id: HOTEL, pet_id: PET, cage_id: CAGE, check_in: "2026-12-20", check_out: "2026-12-23",
      status: "booked", hold: null, source: "whatsapp", rate: 75000, notes: "", cancel_reason: null,
    });
  });

  it("POST: refuses nonsense before asking the database", async () => {
    const { body, fake } = await call(postBooking, request("POST", "/api/bookings", { body: { ...good, checkOut: "2026-12-20", status: "checked_in", hold: "deposit", rate: -1 } }), member(unitsAndPets()));
    expect(Object.keys(body.error.fields).sort()).toEqual(["checkOut", "hold", "rate"]);
    expect(fake.calls).toEqual([]);
  });

  it("POST: the unit and the pet must be the hotel's; an archived unit is 409", async () => {
    const nothing = await call(postBooking, request("POST", "/api/bookings", { body: good }));
    expect(nothing.body.error.fields).toEqual({ cageId: "is not a unit of your hotel", petId: "is not a pet of your hotel" });
    const archived = await call(postBooking, request("POST", "/api/bookings", { body: good }), member(unitsAndPets(undefined, { id: CAGE, price_per_night: 1, archived: true })));
    expect([archived.status, archived.body.error.code]).toEqual([409, "unit_archived"]);
  });

  it("POST: the database's refusals become 409s", async () => {
    const refusal = async (error: { code: string; message: string }) => (await call(postBooking, request("POST", "/api/bookings", { body: good }), member(unitsAndPets(() => ({ error }))))).body.error.code;
    expect(await refusal({ code: "23P01", message: "bookings_no_double_booking: the unit is full on these nights" })).toBe("double_booking");
    expect(await refusal({ code: "23P01", message: 'conflicting key value violates exclusion constraint "bookings_pet_in_one_place"' })).toBe("pet_already_booked");
    expect(await refusal({ code: "23514", message: "bookings_archived_unit: that unit is archived" })).toBe("unit_archived");
    expect(await refusal({ code: "42501", message: "new row violates row-level security policy" })).toBe("forbidden");
  });
});

describe("POST /api/join", () => {
  const form = { hotelName: "Rumah Meong", city: "Bandung", cages: "10-20", whatsapp: "0812 3456 7890" };
  const join = (body: unknown, opts: { limiter?: RateLimiter; headers?: Record<string, string>; respond?: Responder } = {}) =>
    call((req, deps) => postJoin(req, deps, opts.limiter ?? new RateLimiter(5, 60_000)), request("POST", "/api/join", { token: null, body, headers: opts.headers }), opts.respond);

  it("adds the sign-up as an anonymous visitor, without reading it back", async () => {
    const { status, body, fake } = await join(form);
    expect([status, body]).toEqual([201, { ok: true }]);
    const insert = fake.calls.find((c) => c.op === "insert")!;
    expect(insert).toMatchObject({ token: undefined, table: "join_requests", payload: { hotel_name: "Rumah Meong", city: "Bandung", cages: "10-20", whatsapp: "6281234567890", locale: "id" } });
    expect(insert.columns).toBeUndefined();
  });

  it("takes a plain HTML form too", async () => {
    const body = new URLSearchParams({ ...form, locale: "en" }).toString();
    const { status, fake } = await join(body, { headers: { "content-type": "application/x-www-form-urlencoded" } });
    expect(status).toBe(201);
    expect(fake.calls[0].payload).toMatchObject({ locale: "en" });
  });

  it("a filled honeypot looks like success and keeps nothing", async () => {
    const { status, fake } = await join({ ...form, website: "http://spam.example" });
    expect(status).toBe(201);
    expect(fake.calls).toEqual([]);
  });

  it("checks every field", async () => {
    const { status, body } = await join({ hotelName: "", city: "x".repeat(81), cages: "", whatsapp: "123" });
    expect(status).toBe(422);
    expect(Object.keys(body.error.fields).sort()).toEqual(["cages", "city", "hotelName", "whatsapp"]);
  });

  it("slows down one address sending too many", async () => {
    const limiter = new RateLimiter(2, 60_000);
    const headers = { "x-forwarded-for": "203.0.113.9, 10.0.0.1" };
    expect((await join(form, { limiter, headers })).status).toBe(201);
    expect((await join(form, { limiter, headers })).status).toBe(201);
    const third = await join(form, { limiter, headers });
    expect(third.status).toBe(429);
    expect(Number(third.res.headers.get("retry-after"))).toBeGreaterThan(0);
    expect((await join(form, { limiter, headers: { "x-forwarded-for": "198.51.100.7" } })).status).toBe(201);
  });
});

describe("on Vercel", () => {
  it("each file in api/ exports its methods", async () => {
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_ANON_KEY", "");
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");
    const files: [Record<string, unknown>, string[]][] = [
      [await import("../health.js"), ["GET"]],
      [await import("../hotel.js"), ["GET", "POST"]],
      [await import("../owners.js"), ["GET", "POST"]],
      [await import("../pets.js"), ["GET", "POST"]],
      [await import("../bookings.js"), ["GET", "POST"]],
      [await import("../cages.js"), ["GET"]],
      [await import("../join.js"), ["POST"]],
    ];
    for (const [mod, methods] of files) {
      expect(Object.keys(mod).sort()).toEqual(methods);
      for (const m of methods) expect(typeof mod[m]).toBe("function");
    }
    const { GET } = await import("../health.js");
    expect((await GET(request("GET", "/api/health", { token: null }))).status).toBe(503);
  });

  it("the app's catch-all rewrite leaves /api alone", () => {
    const config = JSON.parse(readFileSync(new URL("../../vercel.json", import.meta.url), "utf8")) as { rewrites: { source: string }[] };
    const spa = new RegExp(`^${config.rewrites[0].source}$`);
    expect(spa.test("/app/calendar")).toBe(true);
    expect(spa.test("/")).toBe(true);
    expect(spa.test("/api/hotel")).toBe(false);
    expect(spa.test("/api/bookings")).toBe(false);
  });

  it("ApiError carries status and code", () => {
    const e = new ApiError(409, "double_booking", "full");
    expect([e.status, e.code, e.message]).toEqual([409, "double_booking", "full"]);
  });
});
