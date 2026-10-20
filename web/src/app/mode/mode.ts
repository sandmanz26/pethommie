/**
 * Simple or advanced: how much of the app is on screen. Simple is the everyday core with fewer fields;
 * advanced adds customers, payments, reports and every option. It only changes what is shown, never what is
 * stored or which rules apply, so switching back and forth loses nothing.
 */
export type Mode = "simple" | "advanced";

export const DEFAULT_MODE: Mode = "simple";

/** Kept per account, as a preference of the person rather than part of the hotel's data. */
export const modeKeyFor = (accountId: string) => `pethommie.app.mode.${accountId}`;

export const isMode = (x: unknown): x is Mode => x === "simple" || x === "advanced";

export function readMode(accountId: string): Mode {
  try {
    const stored = localStorage.getItem(modeKeyFor(accountId));
    return isMode(stored) ? stored : DEFAULT_MODE;
  } catch {
    return DEFAULT_MODE;
  }
}

export function writeMode(accountId: string, mode: Mode): void {
  try {
    localStorage.setItem(modeKeyFor(accountId), mode);
  } catch {
    // Blocked storage: the choice lasts until the tab closes.
  }
}
