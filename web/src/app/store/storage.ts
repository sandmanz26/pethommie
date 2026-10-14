import { emptyData, type HotelData } from "../domain/types";

/**
 * Where hotel data lives. Today: this browser's localStorage.
 * When a backend exists, implement this with API calls and swap it in AppStore.
 */
export type HotelRepository = {
  load(): HotelData;
  save(data: HotelData): void;
  clear(): void;
};

const KEY = "pethommie.app.v1";

export const localRepository: HotelRepository = {
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return emptyData();
      const parsed = JSON.parse(raw) as HotelData;
      return parsed && parsed.version === 1 ? { ...emptyData(), ...parsed } : emptyData();
    } catch {
      return emptyData();
    }
  },
  save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      // Storage full or blocked. The app keeps working for this visit.
    }
  },
  clear() {
    try {
      localStorage.removeItem(KEY);
    } catch {
      // nothing to clear
    }
  },
};
