import { useEffect, useRef, useState } from "react";
import type { Booking } from "@/app/domain/types";
import { addDays, bookingTotal, formatDate, formatRupiah, nights, todayISO } from "@/app/domain/logic";
import { paidAmount } from "@/app/domain/payments";
import { useStore } from "@/app/store/AppStore";
import { useAppT } from "@/app/i18n/useAppT";
import { Button } from "@/app/design-system/atoms/Button";
import { Alert } from "@/app/design-system/molecules/Alert";

type Ending = "booked" | "today";

/**
 * Check a pet out. Asks first when it matters: the pet leaves on another day than booked (end the stay today, so the
 * nights are right, or keep the booked dates), or money is still owed, so a balance isn't forgotten at the door.
 * Render `dialog` once on the page and call `request(booking)` from any button.
 */
export function useCheckOut() {
  const { data, checkOut } = useStore();
  const { t, locale } = useAppT();
  const c = t.checkOutFlow;
  const ref = useRef<HTMLDialogElement>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [ending, setEnding] = useState<Ending>("today");
  const [taken, setTaken] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (booking && !d.open) d.showModal?.();
    if (!booking && d.open) d.close();
  }, [booking]);

  const today = todayISO();
  const cage = (b: Booking) => data.cages.find((x) => x.id === b.cageId);
  // The day the stay ends if it ends today: at least one night.
  const endToday = (b: Booking) => (today > b.checkIn ? today : addDays(b.checkIn, 1));
  const totalIf = (b: Booking, e: Ending) => bookingTotal(e === "today" ? { ...b, checkOut: endToday(b) } : b, cage(b));
  const dueIf = (b: Booking, e: Ending) => Math.max(0, totalIf(b, e) - paidAmount(b));

  const request = (b: Booking) => {
    const differs = endToday(b) !== b.checkOut;
    if (!differs && dueIf(b, "booked") === 0) {
      checkOut(b.id);
      return;
    }
    setTaken(false);
    setEnding(differs ? "today" : "booked");
    setBooking(b);
  };

  function confirm() {
    if (!booking) return;
    const issues = checkOut(booking.id, ending === "today" ? endToday(booking) : undefined);
    if (issues.includes("cage_taken")) {
      setTaken(true);
      setEnding("booked");
      return;
    }
    setBooking(null);
  }

  const rp = (n: number) => formatRupiah(n, locale);
  const day = (d: string) => formatDate(d, locale, { weekday: "short", day: "numeric", month: "short" });
  const b = booking;
  const differs = b ? endToday(b) !== b.checkOut : false;
  const late = b ? endToday(b) > b.checkOut : false;
  const due = b ? dueIf(b, ending) : 0;

  const dialog = (
    <dialog ref={ref} className="ds-dialog ds-dialog--form" aria-labelledby="checkout-title" onCancel={(e) => (e.preventDefault(), setBooking(null))}>
      {b && (
        <div className="ds-flowform">
          <h2 id="checkout-title">{c.title}</h2>
          {differs && (
            <fieldset className="ds-flowform__choices">
              <legend>{late ? c.lateQ(day(b.checkOut)) : c.earlyQ(day(b.checkOut))}</legend>
              <label className="ds-check">
                <input type="radio" name="checkout-end" checked={ending === "today"} onChange={() => setEnding("today")} disabled={taken} />
                <span>{late ? c.addNights(nights(b.checkOut, endToday(b)), rp(totalIf(b, "today"))) : c.endToday(nights(b.checkIn, endToday(b)), rp(totalIf(b, "today")))}</span>
              </label>
              <label className="ds-check">
                <input type="radio" name="checkout-end" checked={ending === "booked"} onChange={() => setEnding("booked")} />
                <span>{c.keepDates(rp(totalIf(b, "booked")))}</span>
              </label>
            </fieldset>
          )}
          {taken && <Alert tone="warn">{c.taken}</Alert>}
          <p className={`ds-flowform__note${due > 0 ? " is-owed" : ""}`}>{due > 0 ? c.owed(rp(due)) : c.settled}</p>
          <div className="ds-dialog__actions">
            <Button variant="secondary" onClick={() => setBooking(null)}>
              {t.common.cancel}
            </Button>
            <Button variant={due > 0 ? "danger" : "primary"} onClick={confirm}>
              {due > 0 ? c.confirmOwed : c.confirm}
            </Button>
          </div>
        </div>
      )}
    </dialog>
  );
  return { request, dialog };
}
