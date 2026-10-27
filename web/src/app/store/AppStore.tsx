import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { BookingIssue } from "@/app/domain/bookingRules";
import type { BookingPatch } from "@/app/domain/bookingRules";
import type { CareIssue } from "@/app/domain/careLog";
import type { PaymentIssue } from "@/app/domain/payments";
import type { ExpenseIssue } from "@/app/domain/finance";
import type { ChargeIssue } from "@/app/domain/charges";
import type { InvoiceIssue } from "@/app/domain/invoices";
import type { Arrival, Booking, BookingStatus, CareEntry, Cage, Charge, Expense, Hotel, HotelData, HotelSettings, ISODate, Payment, Pet } from "@/app/domain/types";
import { emptyData } from "@/app/domain/types";
import * as actions from "./actions";
import { sampleData, type SampleKind } from "./sampleData";
import type { HotelRepository } from "./storage";

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

  // A synced hotel: what another device did arrives here and replaces the hotel, like a restored backup.
  useEffect(() => repo.subscribe?.(commit), [repo, commit]);

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
      /** Removes a unit that never had a stay, archives one with history; "busy" while a stay holds it. */
      deleteCage: (id: string) => run((s) => actions.removeCage(s, id)),
      restoreCage: (id: string) => commit(actions.restoreCage(latest.current, id)),
      /** Returns the owner's id; an owner with the same WhatsApp number is reused. */
      saveOwner: (owner: actions.OwnerInput): string => run((s) => actions.upsertOwner(s, owner)),
      savePet: (pet: Pet) => commit(actions.upsertPet(latest.current, pet)),
      /** False for a pet with history (a started, paid or invoiced stay), which is kept. */
      deletePet: (id: string): boolean => run((s) => actions.removePet(s, id)),
      /** Empty when saved; otherwise what is wrong with the booking. */
      saveBooking: (booking: Booking): BookingIssue[] => run((s) => actions.upsertBooking(s, booking)),
      /** False if the stay can't move to that status. */
      setBookingStatus: (id: string, status: BookingStatus): boolean => run((s) => actions.changeBookingStatus(s, id, status)),
      /** Changes dates, cage or notes of an existing stay. Empty when done; otherwise what is wrong. */
      editBooking: (id: string, patch: BookingPatch): BookingIssue[] => run((s) => actions.editBooking(s, id, patch)),
      /** Calls a booked stay off: why, what is given back, and its invoice voided. */
      cancelBooking: (id: string, request: actions.CancelRequest): actions.CancelIssue[] => run((s) => actions.cancelBooking(s, id, request)),
      /** The pet goes home; `endOn` re-dates the stay to the day it really ended. */
      checkOut: (id: string, endOn?: ISODate, lateCharge?: Omit<Charge, "id">): actions.CheckOutIssue[] => run((s) => actions.checkOutBooking(s, id, endOn, lateCharge)),
      /** Confirms a request once its slot is checked free again; "full" if it has been taken meanwhile. */
      confirmBooking: (id: string): actions.ConfirmIssue[] => run((s) => actions.confirmBooking(s, id)),
      /** False unless the stay is booked and confirmed (not a request, not waiting for its deposit). */
      checkIn: (id: string, arrival: Arrival | null): boolean => run((s) => actions.checkInBooking(s, id, arrival)),
      recordPayment: (bookingId: string, payment: Omit<Payment, "id">): PaymentIssue[] => run((s) => actions.recordPayment(s, bookingId, payment)),
      removePayment: (bookingId: string, paymentId: string) => commit(actions.removePayment(latest.current, bookingId, paymentId)),
      addCharge: (bookingId: string, charge: Omit<Charge, "id">): ChargeIssue[] => run((s) => actions.addCharge(s, bookingId, charge)),
      removeCharge: (bookingId: string, chargeId: string) => commit(actions.removeCharge(latest.current, bookingId, chargeId)),
      /** Empty when saved; otherwise what is wrong with the settings. */
      saveSettings: (settings: HotelSettings): actions.SettingsIssue[] => run((s) => actions.saveSettings(s, settings)),
      /** Empty when the invoice was made; otherwise why not. */
      issueInvoice: (bookingId: string, request: { issuedOn: ISODate; language?: "id" | "en"; dueOn?: ISODate | null }): InvoiceIssue[] => run((s) => actions.issueInvoice(s, bookingId, request)),
      voidInvoice: (invoiceId: string, on: ISODate): boolean => run((s) => actions.voidInvoice(s, invoiceId, on)),
      recordCare: (entry: Omit<CareEntry, "id">): CareIssue[] => run((s) => actions.recordCare(s, entry)),
      removeCare: (id: string) => commit(actions.removeCare(latest.current, id)),
      markReportSent: (bookingId: string, date: ISODate, at: string) => commit(actions.markReportSent(latest.current, bookingId, date, at)),
      /** Empty when saved; otherwise what is wrong with it. */
      saveExpense: (expense: Expense): ExpenseIssue[] => run((s) => actions.saveExpense(s, expense)),
      /** Returns how many were added. */
      addExpenses: (list: Omit<Expense, "id">[]): number => run((s) => actions.addExpenses(s, list)),
      removeExpense: (id: string) => commit(actions.removeExpense(latest.current, id)),
      loadSample: (kind: SampleKind = "simple") => commit(sampleData(kind)),
      /** Replaces everything with a restored backup. The caller has already checked it with `parseStored`. */
      importData: (next: HotelData) => commit(next),
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

export function AppStoreProvider({ children, repo }: { children: ReactNode; repo: HotelRepository }) {
  const value = useStoreValue(repo);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStore() {
  const s = useContext(StoreContext);
  if (!s) throw new Error("useStore must be used inside <AppStoreProvider>");
  return s;
}
