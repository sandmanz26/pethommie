import { fromRows, toRows, TABLES, type HotelRow, type Rows, type Table } from "./rows";
import type { HotelData } from "@/app/domain/types";

/**
 * What changed between two states of a hotel, as rows to write and rows to remove. This is how the local store
 * will talk to the server without every action having to know about it: after each change, diff the state before
 * with the state after, and queue the result.
 */

type AnyRow = Record<string, unknown>;
type Key = Record<string, string>;

export type TableChanges = { upsert: AnyRow[]; remove: Key[] };
export type Changes = Record<Table, TableChanges>;

/** The columns that identify a row of each table. */
export const KEYS: Record<Table, readonly string[]> = {
  cages: ["id"],
  owners: ["id"],
  pets: ["id"],
  bookings: ["id"],
  booking_pets: ["booking_id", "pet_id"],
  payments: ["id"],
  charges: ["id"],
  care_entries: ["id"],
  reports_sent: ["booking_id", "report_date"],
  invoices: ["id"],
  expenses: ["id"],
};

const keyOf = (table: Table, row: AnyRow): Key => Object.fromEntries(KEYS[table].map((k) => [k, String(row[k])]));
const idOf = (table: Table, row: AnyRow) => KEYS[table].map((k) => String(row[k])).join("|");

/** Same rows regardless of key order. */
const canonical = (value: unknown): string =>
  JSON.stringify(value, (_k, v) => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v));

export const emptyChanges = (): Changes => Object.fromEntries(TABLES.map((t) => [t, { upsert: [], remove: [] }])) as unknown as Changes;

export const isEmpty = (c: Changes) => TABLES.every((t) => c[t].upsert.length === 0 && c[t].remove.length === 0);

export function diffRows(before: Rows, after: Rows): Changes {
  const changes = emptyChanges();
  for (const table of TABLES) {
    const old = new Map((before[table] as AnyRow[]).map((r) => [idOf(table, r), r]));
    const now = new Map((after[table] as AnyRow[]).map((r) => [idOf(table, r), r]));
    for (const [id, row] of now) {
      const was = old.get(id);
      if (!was || canonical(was) !== canonical(row)) changes[table].upsert.push(row);
    }
    for (const [id, row] of old) if (!now.has(id)) changes[table].remove.push(keyOf(table, row));
  }
  return changes;
}

/** Changes from one local state to the next. The hotel's own row (name, city, WhatsApp) travels separately. */
export function diffData(before: HotelData, after: HotelData, hotelId: string): Changes {
  return diffRows(toRows(before, hotelId).rows, toRows(after, hotelId).rows);
}

/** The rows after the changes are applied: what a server holds, or what a device holds after pulling. */
export function applyChanges(rows: Rows, changes: Changes): Rows {
  const next = { ...rows } as Record<Table, AnyRow[]>;
  for (const table of TABLES) {
    const byId = new Map((rows[table] as AnyRow[]).map((r) => [idOf(table, r), r]));
    for (const key of changes[table].remove) byId.delete(KEYS[table].map((k) => key[k]).join("|"));
    for (const row of changes[table].upsert) byId.set(idOf(table, row), row);
    next[table] = [...byId.values()];
  }
  return next as unknown as Rows;
}

/** A hotel's data after changes arrive from elsewhere (another device, the server). */
export function applyToData(data: HotelData, hotel: HotelRow, changes: Changes): HotelData {
  const { rows } = toRows(data, hotel.id);
  return fromRows(hotel, applyChanges(rows, changes));
}

/** Two sets of changes, one after the other, as one: a later write wins, and removing cancels an earlier write. */
export function mergeChanges(first: Changes, second: Changes): Changes {
  const out = emptyChanges();
  for (const table of TABLES) {
    const upserts = new Map<string, AnyRow>();
    const removes = new Map<string, Key>();
    for (const part of [first[table], second[table]]) {
      for (const key of part.remove) {
        const id = KEYS[table].map((k) => key[k]).join("|");
        removes.set(id, key);
        upserts.delete(id);
      }
      for (const row of part.upsert) {
        const id = idOf(table, row);
        upserts.set(id, row);
        removes.delete(id);
      }
    }
    out[table] = { upsert: [...upserts.values()], remove: [...removes.values()] };
  }
  return out;
}
