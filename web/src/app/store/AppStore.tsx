import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
import { newId } from "../domain/logic";
import type { Booking, BookingStatus, Cage, Hotel, HotelData, Owner, Pet } from "../domain/types";
import { emptyData } from "../domain/types";
import { sampleData } from "./sampleData";
import { localRepository, type HotelRepository } from "./storage";

type Action =
  | { type: "replace"; data: HotelData }
  | { type: "setHotel"; hotel: Hotel }
  | { type: "upsertCage"; cage: Cage }
  | { type: "deleteCage"; id: string }
  | { type: "upsertOwner"; owner: Owner }
  | { type: "upsertPet"; pet: Pet }
  | { type: "deletePet"; id: string }
  | { type: "upsertBooking"; booking: Booking }
  | { type: "setBookingStatus"; id: string; status: BookingStatus };

function upsert<T extends { id: string }>(list: T[], item: T) {
  const i = list.findIndex((x) => x.id === item.id);
  return i === -1 ? [...list, item] : list.map((x) => (x.id === item.id ? item : x));
}

function reducer(state: HotelData, a: Action): HotelData {
  switch (a.type) {
    case "replace":
      return a.data;
    case "setHotel":
      return { ...state, hotel: a.hotel };
    case "upsertCage":
      return { ...state, cages: upsert(state.cages, a.cage) };
    case "deleteCage":
      return { ...state, cages: state.cages.filter((c) => c.id !== a.id) };
    case "upsertOwner":
      return { ...state, owners: upsert(state.owners, a.owner) };
    case "upsertPet":
      return { ...state, pets: upsert(state.pets, a.pet) };
    case "deletePet":
      return {
        ...state,
        pets: state.pets.filter((p) => p.id !== a.id),
        bookings: state.bookings.filter((b) => b.petId !== a.id),
      };
    case "upsertBooking":
      return { ...state, bookings: upsert(state.bookings, a.booking) };
    case "setBookingStatus":
      return {
        ...state,
        bookings: state.bookings.map((b) => (b.id === a.id ? { ...b, status: a.status } : b)),
      };
  }
}

function useStoreValue(repo: HotelRepository) {
  const [data, dispatch] = useReducer(reducer, undefined, () => repo.load());

  useEffect(() => {
    repo.save(data);
  }, [data, repo]);

  /** Saves an owner, reusing an existing one with the same WhatsApp number. Returns the owner id. */
  const saveOwner = useCallback(
    (owner: Omit<Owner, "id"> & { id?: string }) => {
      const existing = owner.whatsapp ? data.owners.find((o) => o.whatsapp === owner.whatsapp && o.id !== owner.id) : undefined;
      const id = owner.id ?? existing?.id ?? newId();
      dispatch({ type: "upsertOwner", owner: { ...owner, id } });
      return id;
    },
    [data.owners],
  );

  return useMemo(
    () => ({
      data,
      setHotel: (hotel: Hotel) => dispatch({ type: "setHotel", hotel }),
      setCages: (cages: Cage[]) => dispatch({ type: "replace", data: { ...data, cages } }),
      saveCage: (cage: Cage) => dispatch({ type: "upsertCage", cage }),
      deleteCage: (id: string) => dispatch({ type: "deleteCage", id }),
      saveOwner,
      savePet: (pet: Pet) => dispatch({ type: "upsertPet", pet }),
      deletePet: (id: string) => dispatch({ type: "deletePet", id }),
      saveBooking: (booking: Booking) => dispatch({ type: "upsertBooking", booking }),
      setBookingStatus: (id: string, status: BookingStatus) => dispatch({ type: "setBookingStatus", id, status }),
      loadSample: () => dispatch({ type: "replace", data: sampleData() }),
      reset: () => {
        repo.clear();
        dispatch({ type: "replace", data: emptyData() });
      },
    }),
    [data, repo, saveOwner],
  );
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
