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
export type PushRefusal = "double_booking" | "stale" | "invalid" | "forbidden";
export type PushResult = { ok: true; cursor: string } | { ok: false; reason: PushRefusal; /** The stay that was refused, when known. */ booking?: string; message?: string };

export interface HotelGateway {
  pull(hotelId: string, cursor: string | null): Promise<PullResult>;
  /** `hotel`: the hotel's own row (name, city, WhatsApp, settings), sent only when it changed. */
  push(hotelId: string, changes: Changes, cursor: string | null, hotel?: HotelRow): Promise<PushResult>;
  /** The hotel the signed-in person belongs to, or null if they have none yet. */
  myHotel(): Promise<string | null>;
  /** Makes the hotel (its creator becomes the owner) and returns its id. Asking twice is harmless. */
  createHotel(hotel: HotelRow): Promise<string>;
}

/** A gateway call that failed for a reason other than the network: the app can't fix it by trying again. */
export class SyncRefused extends Error {
  readonly reason: "forbidden" | "invalid";
  constructor(message: string, reason: "forbidden" | "invalid") {
    super(message);
    this.name = "SyncRefused";
    this.reason = reason;
  }
}

/** A server in memory: keeps one hotel's rows, numbers each accepted push, and refuses what the database would refuse. */
export function createMemoryGateway(
  initialHotel: HotelRow,
  options: { exists?: boolean } = {},
): HotelGateway & { rows: () => Rows; version: () => number; hotel: () => HotelRow | null; offline: (on: boolean) => void } {
  let hotel: HotelRow | null = options.exists === false ? null : initialHotel;
  let down = false;
  const reach = () => {
    if (down) throw new TypeError("Failed to fetch");
  };
  let rows = emptyRows();
  let version = 0;
  /** What each accepted push changed, so a device that is behind can catch up. */
  const log: Changes[] = [];

  return {
    rows: () => rows,
    version: () => version,
    hotel: () => hotel,
    offline: (on) => {
      down = on;
    },
    async myHotel() {
      reach();
      return hotel?.id ?? null;
    },
    async createHotel(row) {
      reach();
      hotel ??= row;
      return hotel.id;
    },
    async pull(_hotelId, cursor) {
      reach();
      if (!hotel) throw new SyncRefused("no such hotel", "forbidden");
      const from = cursor === null ? 0 : Number(cursor);
      const merged = log.slice(from).reduce<Changes>((all, c) => mergeChanges(all, c), emptyChanges());
      return { hotel, changes: merged, cursor: String(version) };
    },
    async push(_hotelId, changes, cursor, row) {
      reach();
      if (!hotel) return { ok: false, reason: "forbidden" };
      if ((cursor === null ? 0 : Number(cursor)) !== version) return { ok: false, reason: "stale" };
      const next = applyChanges(rows, changes);
      const clash = doubleBooked(next, new Set(changes.bookings.upsert.map((b) => String(b.id))));
      if (clash) return { ok: false, reason: "double_booking", booking: clash };
      rows = next;
      if (row) hotel = { ...hotel, name: row.name, city: row.city, whatsapp: row.whatsapp, settings: row.settings };
      log.push(changes);
      version += 1;
      return { ok: true, cursor: String(version) };
    },
  };
}

/** The database's rule: two booked or checked-in stays can't share a cage on any night. Returns one of the two, a pushed one if it can. */
function doubleBooked(rows: Rows, pushed: Set<string>): string | null {
  const live = rows.bookings.filter((b) => b.status === "booked" || b.status === "checked_in");
  for (const [i, a] of live.entries()) {
    const b = live.slice(i + 1).find((b) => a.cage_id === b.cage_id && a.check_in < b.check_out && b.check_in < a.check_out);
    if (b) return pushed.has(b.id) || !pushed.has(a.id) ? b.id : a.id;
  }
  return null;
}
