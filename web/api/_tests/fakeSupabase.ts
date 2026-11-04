import type { SupabaseClient } from "@supabase/supabase-js";
import type { DbError } from "../_lib/db.js";
import type { Deps } from "../_lib/deps.js";

/** One query or rpc as a handler built it. */
export type Call = {
  token?: string;
  table?: string;
  rpc?: string;
  args?: unknown;
  op: "select" | "insert" | "rpc";
  columns?: string;
  payload?: unknown;
  filters: [string, ...unknown[]][];
  single?: "single" | "maybe";
};
export type Answer = { data?: unknown; error?: DbError | null };
export type Responder = (call: Call) => Answer | undefined;

/**
 * Just enough of supabase-js for the handlers: from().select/insert with filters, rpc(), auth.getUser(). Every call
 * is recorded; `respond` decides what the "database" answers (nothing: { data: null }).
 */
export function fakeSupabase(opts: { users?: Record<string, { id: string; email?: string }>; respond?: Responder } = {}) {
  const calls: Call[] = [];
  const tokens: (string | undefined)[] = [];
  const answer = (call: Call) => {
    calls.push(call);
    const a = opts.respond?.(call) ?? {};
    return { data: a.data ?? null, error: a.error ?? null };
  };

  const client = (token?: string) => {
    class Query {
      call: Call;
      constructor(table: string) {
        this.call = { token, table, op: "select", filters: [] };
      }
      select(columns: string) {
        this.call.columns = columns;
        return this;
      }
      insert(payload: unknown) {
        this.call.op = "insert";
        this.call.payload = payload;
        return this;
      }
      eq(...a: unknown[]) {
        this.call.filters.push(["eq", ...a]);
        return this;
      }
      is(...a: unknown[]) {
        this.call.filters.push(["is", ...a]);
        return this;
      }
      lt(...a: unknown[]) {
        this.call.filters.push(["lt", ...a]);
        return this;
      }
      gt(...a: unknown[]) {
        this.call.filters.push(["gt", ...a]);
        return this;
      }
      order(...a: unknown[]) {
        this.call.filters.push(["order", ...a]);
        return this;
      }
      limit(...a: unknown[]) {
        this.call.filters.push(["limit", ...a]);
        return this;
      }
      single() {
        this.call.single = "single";
        return this;
      }
      maybeSingle() {
        this.call.single = "maybe";
        return this;
      }
      then<T>(resolve: (v: Answer) => T, reject?: (e: unknown) => T) {
        return Promise.resolve(answer(this.call)).then(resolve, reject);
      }
    }
    return {
      from: (table: string) => new Query(table),
      rpc: (name: string, args?: unknown) => Promise.resolve(answer({ token, rpc: name, args, op: "rpc", filters: [] })),
      auth: {
        getUser: async (jwt: string) => {
          const user = opts.users?.[jwt];
          return user ? { data: { user }, error: null } : { data: { user: null }, error: { message: "invalid JWT", status: 401 } };
        },
      },
    } as unknown as SupabaseClient;
  };

  const supabase: Deps["supabase"] = (_env, token) => {
    tokens.push(token);
    return client(token);
  };
  return { supabase, calls, tokens };
}

export const ALICE = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", email: "alice@example.com" };
export const HOTEL = "11111111-1111-4111-8111-111111111111";
export const NEW_ID = "99999999-9999-4999-8999-999999999999";
export const TOKEN = "alice-token";

export function testDeps(fake: ReturnType<typeof fakeSupabase>, over: Partial<Deps> = {}): Deps {
  return {
    env: { supabaseUrl: "https://demo.supabase.co", anonKey: "anon-key" },
    supabase: fake.supabase,
    fetch: async () => new Response("{}"),
    now: () => new Date("2026-11-03T20:00:00Z"), // 4 November, 03:00 in Jakarta
    newId: () => NEW_ID,
    ...over,
  };
}

/** A request as Vercel hands it over. */
export function request(method: string, path: string, opts: { token?: string | null; body?: unknown; headers?: Record<string, string> } = {}) {
  const headers: Record<string, string> = { ...opts.headers };
  if (opts.token !== null) headers.authorization = `Bearer ${opts.token ?? TOKEN}`;
  let body: string | undefined;
  if (opts.body !== undefined) {
    body = typeof opts.body === "string" ? opts.body : JSON.stringify(opts.body);
    headers["content-type"] ??= "application/json";
  }
  return new Request(`https://pethommie-web.vercel.app${path}`, { method, headers, body });
}

/** The fake answers for a member of HOTEL: my_hotel is HOTEL. Other calls go to `rest`. */
export const member =
  (rest: Responder = () => undefined): Responder =>
  (call) =>
    call.rpc === "my_hotel" ? { data: HOTEL } : rest(call);

export const has = (call: Call, ...filter: unknown[]) => call.filters.some((f) => JSON.stringify(f) === JSON.stringify(filter));
