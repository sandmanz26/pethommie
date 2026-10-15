// Waitlist storage. There is no backend yet, so submissions are kept in this
// browser's localStorage. When an API exists, implement `WaitlistStore` with a
// fetch call and swap it in `waitlistStore` below; the form does not change.

export type WaitlistEntry = {
  hotelName: string;
  city: string;
  cages: string;
  whatsapp: string;
};

export type WaitlistStore = {
  /** True when entries never leave this device (shown to the user as demo mode). */
  readonly isLocalOnly: boolean;
  submit(entry: WaitlistEntry): Promise<void>;
};

const STORAGE_KEY = "pethommie.waitlist";

export const localWaitlistStore: WaitlistStore = {
  isLocalOnly: true,
  async submit(entry) {
    try {
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as unknown[];
      existing.push({ ...entry, submittedAt: new Date().toISOString() });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    } catch {
      // Storage can be blocked (private mode). Nothing to persist to; accept silently.
    }
  },
};

export const waitlistStore: WaitlistStore = localWaitlistStore;
