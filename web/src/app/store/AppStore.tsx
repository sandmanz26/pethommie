import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { BookingIssue } from "@/app/domain/bookingRules";
import type { Booking, BookingStatus, Cage, Hotel, HotelData, Owner, Pet } from "@/app/domain/types";
import { emptyData } from "@/app/domain/types";
import * as actions from "./actions";
import { sampleData } from "./sampleData";
import { localRepository, type HotelRepository } from "./storage";

function useStoreValue(repo: HotelRepository) {
  const [data, setData] = useState<HotelData>(() => repo.load());
  const [saveFailed, setSaveFailed] = useState(false);

  // Every action reads the latest state from here, not from a render's closure, so several actions
  // in one event (save an owner, then the pet, then its booking) each see the one before.
  const latest = useRef(data);
  const commit = useCallback((next: HotelData) => {
    if (next === latest.current) return;
    latest.current = next;
    setData(next);
  }, []);

  useEffect(() => {
    setSaveFailed(!repo.save(data));
  }, [data, repo]);

  const api = useMemo(() => {
    /** Applies an action that may refuse, and returns its result. */
    const run = <R,>(fn: (s: HotelData) => actions.Outcome<R>): R => {
      const { state, result } = fn(latest.current);
      commit(state);
      return result;
    };
    return {
      setHotel: (hotel: Hotel) => commit(actions.setHotel(latest.current, hotel)),
      setCages: (cages: Cage[]) => commit(actions.setCages(latest.current, cages)),
      saveCage: (cage: Cage) => commit(actions.upsertCage(latest.current, cage)),
      /** False if the cage has a pending or current stay. */
      deleteCage: (id: string): boolean => run((s) => actions.removeCage(s, id)),
      /** Returns the owner's id; an owner with the same WhatsApp number is reused. */
      saveOwner: (owner: Omit<Owner, "id"> & { id?: string }): string => run((s) => actions.upsertOwner(s, owner)),
      savePet: (pet: Pet) => commit(actions.upsertPet(latest.current, pet)),
      deletePet: (id: string) => commit(actions.removePet(latest.current, id)),
      /** Empty when saved; otherwise what is wrong with the booking. */
      saveBooking: (booking: Booking): BookingIssue[] => run((s) => actions.upsertBooking(s, booking)),
      /** False if the stay can't move to that status. */
      setBookingStatus: (id: string, status: BookingStatus): boolean => run((s) => actions.changeBookingStatus(s, id, status)),
      loadSample: () => commit(sampleData()),
      reset: () => {
        repo.clear();
        commit(emptyData());
      },
    };
  }, [commit, repo]);

  return useMemo(() => ({ data, saveFailed, ...api }), [data, saveFailed, api]);
}

type Store = ReturnType<typeof useStoreValue>;
const StoreContext = createContext<Store | null>(null);

export function AppStoreProvider({ children, repo = localRepository }: { children: ReactNode; repo?: HotelRepository }) {
  const value = useStoreValue(repo);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStore() {
  const s = useContext(StoreContext);
  if (!s) throw new Error("useStore must be used inside <AppStoreProvider>");
  return s;
}
