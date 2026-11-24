// @vitest-environment node
import { describe, expect, it } from "vitest";
import { postDispatch } from "../_lib/handlers/dispatch.js";
import { postRequests } from "../_lib/handlers/requests.js";
import { dispatchOutbox } from "../_lib/email/outbox.js";
import { bookingRequestEmail } from "../_lib/email/templates.js";
import { route, type Handler } from "../_lib/route.js";
import { RateLimiter } from "../_lib/rateLimit.js";
import { fakeSupabase, has, request, testEmailDeps, type Responder } from "./fakeSupabase.js";

const HOTEL = "11111111-1111-4111-8111-111111111111";
const OWNER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const REQUEST_ID = "99999999-9999-4999-8999-999999999999";

async function call(
  handler: Handler<ReturnType<typeof testEmailDeps>>,
  req: Request,
  respond: Responder = () => undefined,
  over: Partial<ReturnType<typeof testEmailDeps>> = {},
  usersById: Record<string, { id: string; email?: string }> = {},
) {
  const fake = fakeSupabase({ respond, usersById });
  const deps = testEmailDeps(fake, over);
  const res = await route(handler, () => deps)(req);
  return { res, status: res.status, body: (await res.json()) as Record<string, any>, fake, deps }; // eslint-disable-line @typescript-eslint/no-explicit-any
}

const form = {
  hotelId: HOTEL,
  ownerName: "Sari",
  ownerWa: "0812 3456 7890",
  petName: "Mochi",
  species: "cat",
  checkIn: "2026-12-01",
  checkOut: "2026-12-03",
};

describe("POST /api/requests", () => {
  const post = (body: unknown, opts: { limiter?: RateLimiter; headers?: Record<string, string>; respond?: Responder; over?: Partial<ReturnType<typeof testEmailDeps>> } = {}) =>
    call((req, deps) => postRequests(req, deps, opts.limiter ?? new RateLimiter(10, 60_000)), request("POST", "/api/requests", { token: null, body, headers: opts.headers }), opts.respond, opts.over);

  it("adds the request as an anonymous visitor, without reading it back", async () => {
    const { status, body, fake } = await post(form, { over: { env: { ...testEmailDeps(fakeSupabase()).env, resendApiKey: undefined } } });
    expect([status, body]).toEqual([201, { ok: true }]);
    const insert = fake.calls.find((c) => c.op === "insert")!;
    expect(insert).toMatchObject({ token: undefined, table: "booking_requests", payload: { hotel_id: HOTEL, owner_name: "Sari", owner_wa: "6281234567890", pet_name: "Mochi", species: "cat" } });
  });

  it("a filled honeypot looks like success and keeps nothing", async () => {
    const { status, fake } = await post({ ...form, website: "http://spam.example" });
    expect(status).toBe(201);
    expect(fake.calls).toEqual([]);
  });

  it("checks every field, including check-out after check-in", async () => {
    const { status, body } = await post({ ...form, hotelId: "not-a-uuid", ownerName: "", checkOut: "2026-11-01" });
    expect(status).toBe(422);
    expect(Object.keys(body.error.fields).sort()).toEqual(["checkOut", "hotelId", "ownerName"]);
  });

  it("slows down one address sending too many", async () => {
    const limiter = new RateLimiter(2, 60_000);
    const headers = { "x-forwarded-for": "203.0.113.9" };
    expect((await post(form, { limiter, headers })).status).toBe(201);
    expect((await post(form, { limiter, headers })).status).toBe(201);
    expect((await post(form, { limiter, headers })).status).toBe(429);
  });

  it("refuses when Supabase isn't configured at all", async () => {
    const { status } = await post(form, { over: { env: {} } });
    expect(status).toBe(503);
  });

  it("tries to send the email right away when email is configured, but never fails the request if that errors", async () => {
    const respond: Responder = (c) => {
      if (c.table === "booking_requests" && c.op === "insert") return { data: { hotel_id: HOTEL } };
      if (c.table === "notification_outbox") return { data: [] }; // nothing due yet (the trigger isn't simulated here)
      return undefined;
    };
    const { status, body } = await post(form, { respond });
    expect([status, body]).toEqual([201, { ok: true }]);
  });
});

describe("POST/GET /api/email/dispatch", () => {
  const dispatch = (opts: { secret?: string; respond?: Responder; over?: Partial<ReturnType<typeof testEmailDeps>>; usersById?: Record<string, { id: string; email?: string }> } = {}) =>
    call(postDispatch, request("POST", "/api/email/dispatch", { token: null, headers: { "x-dispatch-secret": opts.secret ?? "dispatch-secret" } }), opts.respond, opts.over, opts.usersById);

  it("refuses without the right secret", async () => {
    expect((await dispatch({ secret: "wrong" })).status).toBe(401);
    expect((await dispatch({ secret: "" })).status).toBe(401);
  });

  it("refuses when email isn't fully configured", async () => {
    const { status } = await dispatch({ over: { env: { supabaseUrl: "https://demo.supabase.co", anonKey: "anon-key" } } });
    expect(status).toBe(503);
  });

  it("sends every due row and marks it sent", async () => {
    const payload = { request_id: REQUEST_ID, owner_name: "Sari", owner_wa: "6281234567890", pet_name: "Mochi", species: "cat", breed: "", check_in: "2026-12-01", check_out: "2026-12-03", preference: "", notes: "", locale: "id" };
    const respond: Responder = (c) => {
      if (c.table === "notification_outbox" && c.op === "select") return { data: [{ id: "row-1", hotel_id: HOTEL, kind: "booking_request", payload, attempts: 0 }] };
      if (c.table === "hotels") return { data: { name: "Rumah Meong", created_by: OWNER_ID } };
      return undefined;
    };
    const { status, body, fake } = await dispatch({ respond, usersById: { [OWNER_ID]: { id: OWNER_ID, email: "owner@example.com" } } });
    expect([status, body.ok, body.processed, body.sent, body.failed]).toEqual([200, true, 1, 1, 0]);
    const update = fake.calls.find((c) => c.table === "notification_outbox" && c.op === "update")!;
    expect(update.payload).toMatchObject({ status: "sent" });
    expect(has(update, "eq", "id", "row-1")).toBe(true);
  });

  it("backs off on failure instead of giving up immediately", async () => {
    const payload = { request_id: REQUEST_ID, owner_name: "Sari", owner_wa: "6281234567890", pet_name: "Mochi", species: "cat", breed: "", check_in: "2026-12-01", check_out: "2026-12-03", preference: "", notes: "", locale: "id" };
    const respond: Responder = (c) => {
      if (c.table === "notification_outbox" && c.op === "select") return { data: [{ id: "row-1", hotel_id: HOTEL, kind: "booking_request", payload, attempts: 0 }] };
      if (c.table === "hotels") return { data: { name: "Rumah Meong", created_by: OWNER_ID } };
      return undefined;
    };
    // No usersById entry: the owner lookup fails, so sending fails.
    const { body, fake } = await dispatch({ respond });
    expect([body.processed, body.sent, body.failed]).toEqual([1, 0, 1]);
    const update = fake.calls.find((c) => c.table === "notification_outbox" && c.op === "update")!;
    expect(update.payload).toMatchObject({ status: "pending", attempts: 1 });
  });

  it("gives up after enough failed attempts", async () => {
    const payload = { request_id: REQUEST_ID, owner_name: "Sari", owner_wa: "6281234567890", pet_name: "Mochi", species: "cat", breed: "", check_in: "2026-12-01", check_out: "2026-12-03", preference: "", notes: "", locale: "id" };
    const respond: Responder = (c) => {
      if (c.table === "notification_outbox" && c.op === "select") return { data: [{ id: "row-1", hotel_id: HOTEL, kind: "booking_request", payload, attempts: 3 }] };
      if (c.table === "hotels") return { data: { name: "Rumah Meong", created_by: OWNER_ID } };
      return undefined;
    };
    const { fake } = await dispatch({ respond });
    const update = fake.calls.find((c) => c.table === "notification_outbox" && c.op === "update")!;
    expect(update.payload).toMatchObject({ status: "failed", attempts: 4 });
  });
});

describe("dispatchOutbox", () => {
  it("can be scoped to one hotel", async () => {
    const fake = fakeSupabase({ respond: () => ({ data: [] }) });
    const deps = testEmailDeps(fake);
    const result = await dispatchOutbox(deps, deps.env as never, { hotelId: HOTEL, limit: 1 });
    expect(result).toEqual({ processed: 0, sent: 0, failed: 0 });
    const select = fake.calls.find((c) => c.table === "notification_outbox" && c.op === "select")!;
    expect(has(select, "eq", "hotel_id", HOTEL)).toBe(true);
    expect(has(select, "eq", "status", "pending")).toBe(true);
  });
});

describe("bookingRequestEmail", () => {
  it("writes a subject and body in the request's own language", () => {
    const payload = { request_id: REQUEST_ID, owner_name: "Sari", owner_wa: "6281234567890", pet_name: "Mochi", species: "cat" as const, breed: "", check_in: "2026-12-01", check_out: "2026-12-03", preference: "", notes: "", locale: "id" as const };
    const email = bookingRequestEmail("Rumah Meong", payload, "https://siomofu.xyz");
    expect(email.subject).toContain("Mochi");
    expect(email.text).toContain("Sari");
    expect(email.html).toContain("Sari");
    expect(email.html).not.toContain("<script");
  });

  it("escapes a visitor's own text in the HTML body", () => {
    const payload = { request_id: REQUEST_ID, owner_name: '<script>alert(1)</script>', owner_wa: "6281234567890", pet_name: "Mochi", species: "cat" as const, breed: "", check_in: "2026-12-01", check_out: "2026-12-03", preference: "", notes: "", locale: "en" as const };
    const email = bookingRequestEmail("Rumah Meong", payload, "https://siomofu.xyz");
    expect(email.html).not.toContain("<script>alert(1)</script>");
    expect(email.html).toContain("&lt;script&gt;");
  });
});
