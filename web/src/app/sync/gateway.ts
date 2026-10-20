import { applyChanges, emptyChanges, mergeChanges, type Changes } from "./diff";
import { emptyRows, type HotelRow, type Rows } from "./rows";

/**
 * What the app needs from a server, and nothing about which server. The real one (Supabase) comes later; until
 * then `createMemoryGateway` behaves like one, so the sync code can be built and tested without a network.
 *
 * Contract:
 *   pull(cursor)   everything that changed after `cursor` (all of it for null), plus a new cursor to ask from next time.
 *   push(changes)  all or nothing. Refused with a reason the app can show: a double booking made on another device
 *                  is the one that matters (the database's exclusion constraint), and `stale` means "pull first".
 */
export type PullResult = { hotel: HotelRow; changes: Changes; cursor: string };
export type PushResult = { ok: true; cursor: string } | { ok: false; reason: "double_booking" | "stale" | "invalid" };

export interface HotelGateway {
  pull(hotelId: string, cursor: string | null): Promise<PullResult>;
  push(hotelId: string, changes: Changes, cursor: string | null): Promise<PushResult>;
}

/** A server in memory: keeps one hotel's rows, numbers each accepted push, and refuses what the database would refuse. */
export function createMemoryGateway(hotel: HotelRow): HotelGateway & { rows: () => Rows; version: () => number } {
  let rows = emptyRows();
  let version = 0;
  /** What each accepted push changed, so a device that is behind can catch up. */
  const log: Changes[] = [];

  return {
    rows: () => rows,
    version: () => version,
    async pull(_hotelId, cursor) {
      const from = cursor === null ? 0 : Number(cursor);
      const merged = log.slice(from).reduce<Changes>((all, c) => mergeChanges(all, c), emptyChanges());
      return { hotel, changes: merged, cursor: String(version) };
    },
    async push(_hotelId, changes, cursor) {
      if ((cursor === null ? 0 : Number(cursor)) !== version) return { ok: false, reason: "stale" };
      const next = applyChanges(rows, changes);
      if (hasDoubleBooking(next)) return { ok: false, reason: "double_booking" };
      rows = next;
      log.push(changes);
      version += 1;
      return { ok: true, cursor: String(version) };
    },
  };
}

/** The database's rule: two booked or checked-in stays can't share a cage on any night. */
function hasDoubleBooking(rows: Rows): boolean {
  const live = rows.bookings.filter((b) => b.status === "booked" || b.status === "checked_in");
  return live.some((a, i) => live.slice(i + 1).some((b) => a.cage_id === b.cage_id && a.check_in < b.check_out && b.check_in < a.check_out));
}
