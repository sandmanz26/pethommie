import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { emptyChanges } from "./diff";
import { SyncRefused } from "./gateway";
import { createSupabaseGateway } from "./supabaseGateway";

/** A client whose every rpc answers the same. (The functions themselves run on Postgres in schema.test.ts.) */
const answering = (answer: { data: unknown; error: { message: string; code?: string } | null }, calls: unknown[] = []) =>
  ({
    rpc: async (fn: string, args: unknown) => {
      calls.push({ fn, args });
      return answer;
    },
  }) as unknown as SupabaseClient;

describe("the Supabase gateway", () => {
  it("treats a failed request as offline, and a refusal as final", async () => {
    await expect(createSupabaseGateway(answering({ data: null, error: { message: "TypeError: Failed to fetch" } })).myHotel()).rejects.not.toBeInstanceOf(SyncRefused);
    await expect(createSupabaseGateway(answering({ data: null, error: { message: "not a member", code: "42501" } })).pull("h", null)).rejects.toMatchObject({ reason: "forbidden" });
  });

  it("sends the hotel's own row only when given, and passes a refused push on as an answer", async () => {
    const calls: { fn: string; args: Record<string, unknown> }[] = [];
    const gateway = createSupabaseGateway(answering({ data: { ok: false, reason: "double_booking", booking: "b-1", message: "full" }, error: null }, calls));
    expect(await gateway.push("h", emptyChanges(), "2026-10-27T00:00:00Z")).toEqual({ ok: false, reason: "double_booking", booking: "b-1", message: "full" });
    expect(calls[0].fn).toBe("push_changes");
    expect(calls[0].args).toMatchObject({ p_hotel: "h", p_cursor: "2026-10-27T00:00:00Z" });
    expect((calls[0].args.p_changes as Record<string, unknown>).hotel).toBeUndefined();
  });
});
