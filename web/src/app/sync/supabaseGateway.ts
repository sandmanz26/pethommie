import type { SupabaseClient } from "@supabase/supabase-js";
import { emptyChanges, type Changes } from "./diff";
import { SyncRefused, type HotelGateway, type PullResult, type PushRefusal, type PushResult } from "./gateway";
import { TABLES, type HotelRow } from "./rows";

/**
 * `HotelGateway` over Supabase: four Postgres functions (backend/supabase/migrations/0007_sync_functions.sql), each
 * run as the signed-in user, so row level security decides what they may touch.
 *
 * A failed call throws: a `SyncRefused` when the server said no (not a member), a plain error otherwise, which the
 * sync engine treats as "offline, try again later". A refused push is an answer, not an error.
 */

type RpcError = { message: string; code?: string };

export function createSupabaseGateway(client: SupabaseClient): HotelGateway {
  async function call<T>(fn: string, args: Record<string, unknown>): Promise<T> {
    const { data, error } = (await client.rpc(fn, args)) as { data: unknown; error: RpcError | null };
    if (error) {
      // 42501: insufficient privilege (not a member); 22xxx/23xxx: the data itself was refused.
      if (error.code === "42501") throw new SyncRefused(error.message, "forbidden");
      if (error.code && /^2[23]/.test(error.code)) throw new SyncRefused(error.message, "invalid");
      throw new Error(error.message);
    }
    return data as T;
  }

  return {
    async myHotel() {
      return (await call<string | null>("my_hotel", {})) ?? null;
    },

    async createHotel(hotel: HotelRow) {
      return call<string>("create_hotel", { p_id: hotel.id, p_name: hotel.name, p_city: hotel.city, p_whatsapp: hotel.whatsapp, p_settings: hotel.settings });
    },

    async pull(hotelId, cursor): Promise<PullResult> {
      const answer = await call<{ hotel: HotelRow; changes: Partial<Changes>; cursor: string }>("pull_changes", { p_hotel: hotelId, p_since: cursor });
      const changes = emptyChanges();
      for (const t of TABLES) {
        const part = answer.changes?.[t];
        if (part) changes[t] = { upsert: part.upsert ?? [], remove: part.remove ?? [] };
      }
      return { hotel: answer.hotel, changes, cursor: answer.cursor };
    },

    async push(hotelId, changes, cursor, hotel): Promise<PushResult> {
      const payload: Record<string, unknown> = { ...changes };
      if (hotel) payload.hotel = { name: hotel.name, city: hotel.city, whatsapp: hotel.whatsapp, settings: hotel.settings };
      const answer = await call<{ ok: boolean; cursor?: string; reason?: PushRefusal; booking?: string | null; message?: string }>("push_changes", {
        p_hotel: hotelId,
        p_changes: payload,
        p_cursor: cursor,
      });
      if (answer.ok) return { ok: true, cursor: answer.cursor ?? cursor ?? "" };
      return { ok: false, reason: answer.reason ?? "invalid", ...(answer.booking ? { booking: answer.booking } : {}), ...(answer.message ? { message: answer.message } : {}) };
    },
  };
}
