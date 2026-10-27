import { emptyData, type HotelData } from "@/app/domain/types";
import { newId } from "@/app/domain/logic";
import { createLocalRepository, type HotelRepository } from "@/app/store/storage";
import { applyChanges, diffData, diffRows, emptyChanges, isEmpty, mergeChanges, type Changes } from "./diff";
import { SyncRefused, type HotelGateway, type PullResult } from "./gateway";
import { emptyRows, fromRows, toRows, TABLES, type HotelRow } from "./rows";

/**
 * A hotel kept on this device and in step with a server (Phase 1 of docs/backend/README.md).
 *
 * The app reads and writes the local copy as before: `load()` stays synchronous and `save()` never waits on a network.
 * Each save is diffed against the previous one and the difference goes into an outbox kept in localStorage next to
 * the data, so a closed tab or a day without signal loses nothing. The outbox is pushed shortly after a change, and
 * the server is pulled on start, when the window gets focus and when the connection comes back. Remote changes reach
 * the store through `subscribe`, the same way a restored backup does (a full replacement).
 *
 *   stale            the server has news: pull, then push again.
 *   double_booking   another device took the unit first. Nothing is dropped: the stay stays here and in the outbox,
 *                    the status names it, and the next change (moving it) is pushed again.
 *   network failure  "offline"; the outbox waits.
 *
 * A device that has no hotel on the server yet (first sign-in) finds the person's hotel, or creates it once the
 * local hotel exists (onboarding saved it), and then uploads everything it holds.
 */

export type SyncStatus =
  | { state: "synced"; at: string }
  /** Changes on this device not on the server yet (or being sent), or the server not reached yet. */
  | { state: "pending" }
  | { state: "offline" }
  | { state: "conflict"; reason: "double_booking" | "forbidden" | "invalid"; booking?: string; message?: string };

export type SyncedRepository = HotelRepository & {
  /** Remote changes, as the whole new hotel. Returns the unsubscribe. */
  subscribe(listener: (data: HotelData) => void): () => void;
  status(): SyncStatus;
  onStatus(listener: (status: SyncStatus) => void): () => void;
  /** Pull, then push what is waiting. Resolves when done (or failed); never throws. */
  sync(): Promise<void>;
  /** Syncs now and on focus / when back online. Returns the stop. */
  start(): () => void;
  hotelId(): string | null;
};

type Meta = {
  hotelId: string | null;
  cursor: string | null;
  /** Everything on this device has been queued for the server once. */
  uploaded: boolean;
  outbox: Changes;
  /** The hotel's own row (name, city, WhatsApp, settings) changed here and isn't on the server yet. */
  hotelDirty: boolean;
};

export type SyncedRepositoryOptions = {
  /** localStorage key of the hotel's data (the same one `createLocalRepository` uses). */
  key: string;
  gateway: HotelGateway;
  /** The server's hotel id, when already known; otherwise it is found or created on the first sync. */
  hotelId?: string | null;
  initial?: () => HotelData;
  /** Pause after a change before pushing it. null: only when `sync()` is called (tests). */
  debounceMs?: number | null;
  /** How many times a push is retried after "pull first" before waiting for the next sync. */
  maxRetries?: number;
};

const canonical = (v: unknown) => JSON.stringify(v);
const hotelPart = (row: HotelRow) => canonical({ name: row.name, city: row.city, whatsapp: row.whatsapp, settings: row.settings });

export const syncMetaKeyFor = (key: string) => `${key}.sync`;

export function createSyncedRepository(options: SyncedRepositoryOptions): SyncedRepository {
  const { key, gateway, initial = emptyData, debounceMs = 1500, maxRetries = 3 } = options;
  const local = createLocalRepository(key, initial);
  const metaKey = syncMetaKeyFor(key);

  let meta: Meta = readMeta() ?? { hotelId: options.hotelId ?? null, cursor: null, uploaded: false, outbox: emptyChanges(), hotelDirty: false };
  if (options.hotelId && meta.hotelId !== options.hotelId) meta = { hotelId: options.hotelId, cursor: null, uploaded: false, outbox: emptyChanges(), hotelDirty: false };

  /** The data as last saved or pulled: what the next save is diffed against. */
  let last: HotelData | null = null;
  /** The changes on their way to the server right now (also kept in the stored outbox until they're in). */
  let inflight: { changes: Changes; hotel: boolean } | null = null;
  /** A refused push waits for the next change before it is tried again. */
  let blocked = false;
  let status: SyncStatus = { state: "pending" };
  let running: Promise<void> | null = null;
  let again = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const dataListeners = new Set<(data: HotelData) => void>();
  const statusListeners = new Set<(s: SyncStatus) => void>();

  function readMeta(): Meta | null {
    try {
      const raw = localStorage.getItem(metaKey);
      if (!raw) return null;
      const m = JSON.parse(raw) as Partial<Meta>;
      const outbox = emptyChanges();
      for (const t of TABLES) if (m.outbox?.[t]) outbox[t] = { upsert: m.outbox[t].upsert ?? [], remove: m.outbox[t].remove ?? [] };
      return { hotelId: m.hotelId ?? null, cursor: m.cursor ?? null, uploaded: Boolean(m.uploaded), outbox, hotelDirty: Boolean(m.hotelDirty) };
    } catch {
      return null;
    }
  }

  function writeMeta() {
    try {
      // What's in flight stays in the stored outbox until the server has it: a tab closed mid-push sends it again.
      const outbox = inflight ? mergeChanges(inflight.changes, meta.outbox) : meta.outbox;
      localStorage.setItem(metaKey, JSON.stringify({ ...meta, outbox, hotelDirty: meta.hotelDirty || Boolean(inflight?.hotel) }));
    } catch {
      // Storage full or blocked: the data itself already says so (save() returns false); sync still works this session.
    }
  }

  function setStatus(next: SyncStatus) {
    if (canonical(next) === canonical(status)) return;
    status = next;
    for (const l of statusListeners) l(status);
  }

  const current = () => (last ??= local.load());
  const waiting = () => !isEmpty(meta.outbox) || meta.hotelDirty;

  function schedule() {
    if (debounceMs === null) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      void sync();
    }, debounceMs);
  }

  /** Queues everything this device holds, once: the first sync of a hotel uploads the local data. */
  function queueUpload(hotelId: string) {
    const data = current();
    meta.outbox = mergeChanges(diffRows(emptyRows(), toRows(data, hotelId).rows), meta.outbox);
    meta.hotelDirty = meta.hotelDirty || data.hotel !== null;
    meta.uploaded = true;
    writeMeta();
  }

  /** Finds the person's hotel on the server, or makes it from the local one. Null while there is nothing to make. */
  async function resolveHotel(): Promise<string | null> {
    if (meta.hotelId) return meta.hotelId;
    let id = await gateway.myHotel();
    if (!id) {
      const data = current();
      if (!data.hotel) return null;
      id = await gateway.createHotel(toRows(data, newId()).hotel);
    }
    meta = { ...meta, hotelId: id, cursor: null };
    writeMeta();
    return id;
  }

  /** Remote changes on top of the local copy, with what this device hasn't sent yet on top again. */
  function applyPull(hotelId: string, pulled: PullResult) {
    const data = current();
    const pending = inflight ? mergeChanges(inflight.changes, meta.outbox) : meta.outbox;
    const { hotel: localHotel, rows } = toRows(data, hotelId);
    const merged = applyChanges(applyChanges(rows, pulled.changes), pending);
    const keepLocalHotel = meta.hotelDirty || Boolean(inflight?.hotel);
    let next = fromRows(keepLocalHotel ? localHotel : pulled.hotel, merged);
    if (keepLocalHotel) next = { ...next, hotel: data.hotel, settings: data.settings };
    meta.cursor = pulled.cursor;
    writeMeta();
    if (canonical(next) === canonical(data)) return;
    last = next;
    local.save(next);
    for (const l of dataListeners) l(next);
  }

  async function pushOnce(hotelId: string): Promise<"done" | "stale" | "refused"> {
    const data = current();
    const sendHotel = meta.hotelDirty && data.hotel !== null;
    inflight = { changes: meta.outbox, hotel: sendHotel };
    meta = { ...meta, outbox: emptyChanges(), hotelDirty: false };
    let ok = false;
    try {
      const res = await gateway.push(hotelId, inflight.changes, meta.cursor, sendHotel ? toRows(data, hotelId).hotel : undefined);
      if (res.ok) {
        ok = true;
        meta.cursor = res.cursor;
        return "done";
      }
      if (res.reason === "stale") return "stale";
      blocked = true;
      setStatus({ state: "conflict", reason: res.reason, ...(res.booking ? { booking: res.booking } : {}), ...(res.message ? { message: res.message } : {}) });
      return "refused";
    } finally {
      if (!ok && inflight) meta = { ...meta, outbox: mergeChanges(inflight.changes, meta.outbox), hotelDirty: meta.hotelDirty || inflight.hotel };
      inflight = null;
      writeMeta();
    }
  }

  async function run() {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setStatus({ state: "offline" });
      return;
    }
    try {
      const hotelId = await resolveHotel();
      if (!hotelId) {
        setStatus({ state: "pending" });
        return;
      }
      if (!meta.uploaded) queueUpload(hotelId);
      applyPull(hotelId, await gateway.pull(hotelId, meta.cursor));
      for (let attempt = 0; !blocked && waiting() && attempt <= maxRetries; attempt++) {
        const outcome = await pushOnce(hotelId);
        if (outcome === "refused") return;
        if (outcome === "stale") applyPull(hotelId, await gateway.pull(hotelId, meta.cursor));
      }
      if (blocked) return; // the conflict status stays until a change clears it
      setStatus(waiting() ? { state: "pending" } : { state: "synced", at: new Date().toISOString() });
    } catch (e) {
      if (e instanceof SyncRefused) setStatus({ state: "conflict", reason: e.reason, message: e.message });
      else setStatus({ state: "offline" });
    }
  }

  function sync(): Promise<void> {
    if (running) {
      again = true;
      return running;
    }
    running = (async () => {
      do {
        again = false;
        await run();
      } while (again);
      running = null;
    })();
    return running;
  }

  return {
    load() {
      last = local.load();
      return last;
    },
    save(data) {
      const saved = local.save(data);
      const before = current();
      last = data;
      if (data === before) return saved;
      if (meta.hotelId && meta.uploaded) {
        const changes = diffData(before, data, meta.hotelId);
        const rows = (d: HotelData) => toRows(d, meta.hotelId!).hotel;
        const hotelChanged = data.hotel !== null && (before.hotel === null || hotelPart(rows(before)) !== hotelPart(rows(data)));
        if (isEmpty(changes) && !hotelChanged) return saved;
        meta = { ...meta, outbox: mergeChanges(meta.outbox, changes), hotelDirty: meta.hotelDirty || hotelChanged };
        writeMeta();
      }
      blocked = false;
      if (status.state !== "offline") setStatus({ state: "pending" });
      schedule();
      return saved;
    },
    clear() {
      local.clear();
      last = null;
    },
    subscribe(listener) {
      dataListeners.add(listener);
      return () => dataListeners.delete(listener);
    },
    status: () => status,
    onStatus(listener) {
      statusListeners.add(listener);
      return () => statusListeners.delete(listener);
    },
    sync,
    hotelId: () => meta.hotelId,
    start() {
      void sync();
      if (typeof window === "undefined") return () => undefined;
      const onFocus = () => void sync();
      const onOffline = () => setStatus({ state: "offline" });
      window.addEventListener("focus", onFocus);
      window.addEventListener("online", onFocus);
      window.addEventListener("offline", onOffline);
      return () => {
        window.removeEventListener("focus", onFocus);
        window.removeEventListener("online", onFocus);
        window.removeEventListener("offline", onOffline);
        if (timer) clearTimeout(timer);
        timer = null;
      };
    },
  };
}
