import { describe, expect, it } from "vitest";
import { activeOffer, OFFER_KEY, startOffer, timeLeft } from "./offer";

const memory = (): Storage => {
  const m = new Map<string, string>();
  return {
    get length() {
      return m.size;
    },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, v),
  };
};

const NOW = Date.parse("2026-10-23T10:00:00Z");
const DAY = 86_400_000;

describe("the demo offer", () => {
  it("runs for three days from the first visit, and coming back does not restart it", () => {
    const s = memory();
    expect(startOffer(s, NOW)).toBe(NOW + 3 * DAY);
    expect(startOffer(s, NOW + DAY)).toBe(NOW + 3 * DAY);
    expect(s.getItem(OFFER_KEY)).toBe("2026-10-26T10:00:00.000Z");
  });

  it("is kept with a new account only while it is still running", () => {
    const s = memory();
    expect(activeOffer(s, NOW)).toBeNull();
    startOffer(s, NOW);
    expect(activeOffer(s, NOW + DAY)).toEqual({ code: "DEMO50", percentOff: 50, expiresAt: "2026-10-26T10:00:00.000Z" });
    expect(activeOffer(s, NOW + 3 * DAY)).toBeNull();
  });

  it("ignores an unreadable stored date and starts again", () => {
    const s = memory();
    s.setItem(OFFER_KEY, "soon");
    expect(startOffer(s, NOW)).toBe(NOW + 3 * DAY);
  });

  it("counts down in days, hours, minutes and seconds, and stops at zero", () => {
    expect(timeLeft(NOW + 2 * DAY + 3 * 3600_000 + 4 * 60_000 + 5_000, NOW)).toEqual({ over: false, days: 2, hours: 3, minutes: 4, seconds: 5 });
    expect(timeLeft(NOW - 1, NOW)).toEqual({ over: true, days: 0, hours: 0, minutes: 0, seconds: 0 });
  });
});
