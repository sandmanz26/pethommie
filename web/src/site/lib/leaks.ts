/**
 * The money a pet hotel run from a notebook and chats loses each month, by the landing page's stated assumptions.
 * An example, not a measurement: every assumption is shown next to its number on the page.
 */
export const LEAK_ASSUMPTIONS = {
  /** Nights a month, per place, that were free but weren't sold (never more than the nights actually free). */
  lostNightsPerCage: 1,
  /** Share of what is billed that is never collected: balances left at a rushed pickup. */
  unpaidShare: 0.03,
  /** Share of what is billed that is never billed at all: extras done and forgotten by checkout. */
  extrasShare: 0.02,
  /** Time spent answering owners and typing reports. */
  hoursPerDay: 1,
  days: 30,
};

export type HotelSize = { cages: number; rate: number; occupancy: number };
export type Leaks = { billed: number; empty: number; unpaid: number; extras: number; hours: number; total: number; year: number };

const thousands = (n: number) => Math.round(n / 1000) * 1000;

export function leaksFor({ cages, rate, occupancy }: HotelSize, a = LEAK_ASSUMPTIONS): Leaks {
  const nights = cages * a.days;
  const sold = nights * (occupancy / 100);
  const billed = thousands(sold * rate);
  const empty = thousands(Math.min(cages * a.lostNightsPerCage, nights - sold) * rate);
  const unpaid = thousands(billed * a.unpaidShare);
  const extras = thousands(billed * a.extrasShare);
  const total = empty + unpaid + extras;
  return { billed, empty, unpaid, extras, hours: a.hoursPerDay * a.days, total, year: total * 12 };
}

/** "Rp 1.710.000", grouped the Indonesian way in either language. */
export const rupiah = (n: number) => `Rp ${new Intl.NumberFormat("id-ID").format(n)}`;
