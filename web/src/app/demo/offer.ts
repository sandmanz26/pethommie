import type { Offer } from "@/app/auth/types";

/**
 * The discount shown during "Try now": a share off the first paid plan, for a few days from the first time this
 * browser opened the demo. The clock starts once and is not restarted by leaving and coming back.
 */
export const DEMO_OFFER = { code: "DEMO50", percentOff: 50, days: 3 } as const;
export const OFFER_KEY = "pethommie.demo.offerEndsAt";

const DAY = 24 * 60 * 60 * 1000;

function read(storage: Storage): number | null {
  try {
    const at = Date.parse(storage.getItem(OFFER_KEY) ?? "");
    return Number.isFinite(at) ? at : null;
  } catch {
    return null;
  }
}

/** When the offer ends, starting the clock now if this browser has never seen it. */
export function startOffer(storage: Storage = localStorage, now = Date.now()): number {
  const known = read(storage);
  if (known !== null) return known;
  const ends = now + DEMO_OFFER.days * DAY;
  try {
    storage.setItem(OFFER_KEY, new Date(ends).toISOString());
  } catch {
    // storage blocked: the offer still runs for this visit
  }
  return ends;
}

/** The offer to keep with a new account, if one was started in this browser and has not ended. */
export function activeOffer(storage: Storage = localStorage, now = Date.now()): Offer | null {
  const ends = read(storage);
  if (ends === null || ends <= now) return null;
  return { code: DEMO_OFFER.code, percentOff: DEMO_OFFER.percentOff, expiresAt: new Date(ends).toISOString() };
}

/** Whole days, hours, minutes and seconds until `ends`; all zero once it has passed. */
export function timeLeft(ends: number, now = Date.now()) {
  const ms = Math.max(0, ends - now);
  const s = Math.floor(ms / 1000);
  return { over: ms === 0, days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60 };
}
