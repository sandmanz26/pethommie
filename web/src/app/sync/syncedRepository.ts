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
 *
 * A device with no hotel of its own (a second phone, a cleared browser) must not be sent through onboarding while the
 * server may still have one: `arrival()` says whether the hotel is here, being fetched, not on the server at all, or
 * out of reach. And if a hotel was set up here anyway while the person already had one on the server (two devices
 * at once), the server's hotel wins: it is pulled in whole, nothing of the local one is uploaded into it, and the
 * local one is set aside under `setAsideKeyFor(key)` instead of being lost.
 *
 * Erasing: `clear()` followed by saving the empty hotel (what "Delete all data" does) removes every row on the server
 * too, so every device loses it; the hotel itself stays on the server, waiting for this device to set it up again.
 * `forget()` is the other way: only this device's copy and its unsent changes go, and the next sign-in pulls it back.
 */

/**
 * Whether this device has the hotel to show.
 *   ready        it is here (a local copy, or pulled).
 *   waiting      nothing here yet; the server is being asked.
 *   none         the server has no hotel for this person, or this device erased it: set one up.
 *   unreachable  nothing here and the server could not be asked (offline, or it refused).
 */
export type Arrival = "ready" | "waiting" | "none" | "unreachable";

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
  arrival(): Arrival;
  onArrival(listener: (arrival: Arrival) => void): () => void;
  /** Rows (and the hotel's own row) changed on this device that the server doesn't have yet. */
  unsent(): number;
  /**
   * Removes the hotel from this device only: its local copy and the changes not sent yet. The server and other devices
   * keep it. The repository stops working after this (sign out next); a new one pulls the hotel back.
   */
  forget(): void;
};

type Meta = {
  hotelId: string | null;
  cursor: string | null;
  /** Everything on this device has been queued for the server once. */
  uploaded: boolean;
  outbox: Changes;
  /** The hotel's own row (name, city, WhatsApp, settings) changed here and isn't on the server yet. */
  hotelDirty: boolean;
  /** The id this device is creating its hotel under, until the server has answered (a retry uses the same one). */
  creating: string | null;
  /** The hotel was erased here (and on the server): the server's hotel row is not brought back until set up again. */
  awaitingSetup: boolean;
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
/** Where a hotel set up on this device is kept when the person turned out to have one on the server already. */
export const setAsideKeyFor = (key: string) => `${key}.set-aside`;

const freshMeta = (hotelId: string | null): Meta => ({ hotelId, cursor: null, uploaded: false, outbox: emptyChanges(), hotelDirty: false, creating: null, awaitingSetup: false });

export function createSyncedRepository(options: SyncedRepositoryOptions): SyncedRepository {
  const { key, gateway, initial = emptyData, debounceMs = 1500, maxRetries = 3 } = options;
  const local = createLocalRepository(key, initial);
  const metaKey = syncMetaKeyFor(key);

  let meta: Meta = readMeta() ?? freshMeta(options.hotelId ?? null);
  if (options.hotelId && meta.hotelId !== options.hotelId) meta = freshMeta(options.hotelId);

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
  /** Set by `forget()`: nothing is written or sent any more. */
  let closed = false;
  const dataListeners = new Set<(data: HotelData) => void>();
  const statusListeners = new Set<(s: SyncStatus) => void>();
  const arrivalListeners = new Set<(a: Arrival) => void>();

  function readMeta(): Meta | null {
    try {
      const raw = localStorage.getItem(metaKey);
      if (!raw) return null;
      const m = JSON.parse(raw) as Partial<Meta>;
      const outbox = emptyChanges();
      for (const t of TABLES) if (m.outbox?.[t]) outbox[t] = { upsert: m.outbox[t].upsert ?? [], remove: m.outbox[t].remove ?? [] };
      return {
        hotelId: m.hotelId ?? null,
        cursor: m.cursor ?? null,
        uploaded: Boolean(m.uploaded),
        outbox,
        hotelDirty: Boolean(m.hotelDirty),
        creating: m.creating ?? null,
        awaitingSetup: Boolean(m.awaitingSetup),
      };
    } catch {
      return null;
    }
  }

  function writeMeta() {
    if (closed) return;
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

  let arrival: Arrival = current().hotel ? "ready" : meta.awaitingSetup ? "none" : "waiting";
  function setArrival(next: Arrival) {
    if (next === arrival) return;
    arrival = next;
    for (const l of arrivalListeners) l(arrival);
  }

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
    if (id && id !== meta.creating && current().hotel) return adopt(id);
    if (!id) {
      const data = current();
      if (!data.hotel) {
        setArrival("none");
        return null;
      }
      // Asking twice (the answer was lost) must not make a second hotel: keep the id until the server has answered.
      if (!meta.creating) {
        meta.creating = newId();
        writeMeta();
      }
      id = await gateway.createHotel(toRows(data, meta.creating).hotel);
    }
    meta = { ...meta, hotelId: id, cursor: null, creating: null };
    writeMeta();
    return id;
  }

  /**
   * The person already has a hotel on the server, and this device set up another one before it knew (two devices at
   * once, or a first sign-in that skipped the wait). The server's hotel wins: uploading the local one into it would
   * rename it and add a second set of units. The local hotel is kept aside, not lost.
   */
  async function adopt(id: string): Promise<string> {
    const pulled = await gateway.pull(id, null);
    if (closed) return id;
    try {
      localStorage.setItem(setAsideKeyFor(key), JSON.stringify(current()));
    } catch {
      // No room to keep it aside: the server's hotel still wins, so the two never mix.
    }
    meta = { ...freshMeta(id), uploaded: true };
    applyPull(id, pulled, true);
    return id;
  }

  /**
   * Remote changes on top of the local copy, with what this device hasn't sent yet on top again. `replace`: the
   * pulled hotel replaces the local one entirely.
   */
  function applyPull(hotelId: string, pulled: PullResult, replace = false) {
    if (closed) return;
    const data = current();
    const pending = replace ? emptyChanges() : inflight ? mergeChanges(inflight.changes, meta.outbox) : meta.outbox;
    const { hotel: localHotel, rows } = toRows(data, hotelId);
    const merged = applyChanges(applyChanges(replace ? emptyRows() : rows, pulled.changes), pending);
    const keepLocalHotel = !replace && (meta.hotelDirty || Boolean(inflight?.hotel) || meta.awaitingSetup);
    let next = fromRows(keepLocalHotel ? localHotel : pulled.hotel, merged);
    if (keepLocalHotel) next = { ...next, hotel: data.hotel, settings: data.settings };
    meta.cursor = pulled.cursor;
    writeMeta();
    if (canonical(next) !== canonical(data)) {
      last = next;
      local.save(next);
      for (const l of dataListeners) l(next);
    }
    // After the data, so whoever shows the hotel already has it when it is said to be here.
    setArrival(next.hotel ? "ready" : "none");
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
    if (closed) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setStatus({ state: "offline" });
      if (arrival === "waiting") setArrival("unreachable");
      return;
    }
    if (arrival === "unreachable") setArrival("waiting");
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
      if (arrival === "waiting") setArrival("unreachable");
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
      if (closed) return true;
      const saved = local.save(data);
      const before = current();
      last = data;
      if (data === before) return saved;
      if (data.hotel) {
        meta.awaitingSetup = false;
        setArrival("ready");
      } else if (before.hotel) {
        // Erased ("Delete all data"): the server's copy of the hotel row must not bring it back here.
        meta.awaitingSetup = true;
        setArrival("none");
        writeMeta();
      }
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
    /**
     * Erases the hotel. The copy that was here stays the base of the next `save()`, so saving the empty hotel after
     * this removes every row on the server as well, and so on every device signed in to it.
     */
    clear() {
      current();
      local.clear();
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
    arrival: () => arrival,
    onArrival(listener) {
      arrivalListeners.add(listener);
      return () => arrivalListeners.delete(listener);
    },
    unsent() {
      const all = inflight ? mergeChanges(inflight.changes, meta.outbox) : meta.outbox;
      return TABLES.reduce((n, t) => n + all[t].upsert.length + all[t].remove.length, 0) + (meta.hotelDirty || inflight?.hotel ? 1 : 0);
    },
    forget() {
      closed = true;
      if (timer) clearTimeout(timer);
      timer = null;
      local.clear();
      try {
        localStorage.removeItem(metaKey);
      } catch {
        // nothing stored
      }
      meta = freshMeta(null);
      last = null;
      setStatus({ state: "pending" });
      setArrival("waiting");
    },
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
