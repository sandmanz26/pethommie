import { useEffect, useRef, useState } from "react";
import type { Booking } from "@/app/domain/types";
import { addDays, bookingTotal, countingOf, formatDate, formatRupiah, isShared, nightlyRate, nights, stayDays, stayPetIds, todayISO } from "@/app/domain/logic";
import { paidAmount } from "@/app/domain/payments";
import { lateFee } from "@/app/domain/stayRules";
import { moneyError } from "@/app/forms/messages";
import { parseRupiah } from "@/shared/lib/validate";
import { Field } from "@/app/design-system/molecules/Field";
import { Input } from "@/app/design-system/atoms/Input";
import { MoneyInput } from "@/app/design-system/atoms/MoneyInput";
import { useStore } from "@/app/store/AppStore";
import { useAppT } from "@/app/i18n/useAppT";
import { Button } from "@/app/design-system/atoms/Button";
import { Alert } from "@/app/design-system/molecules/Alert";

type Ending = "booked" | "today";

const two = (n: number) => String(n).padStart(2, "0");
/** The local time now, "HH:MM". */
const clockNow = () => {
  const d = new Date();
  return `${two(d.getHours())}:${two(d.getMinutes())}`;
};
const timeOfDay = (iso: string) => {
  const d = new Date(iso);
  return `${two(d.getHours())}:${two(d.getMinutes())}`;
};

/**
 * Check a pet out. Asks first when it matters: the pet leaves on another day than booked (end the stay today, so the
 * nights are right, or keep the booked dates), the pet is picked up after the hotel's limit and grace period (the
 * late fee from the booking settings is proposed as a charge, to keep, change or skip), or money is still owed, so a
 * balance isn't forgotten at the door.
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
  // When the pet was picked up (today, "HH:MM"), and the late fee as the operator agrees to it.
  const [time, setTime] = useState(clockNow());
  const [feeOn, setFeeOn] = useState(true);
  const [feeText, setFeeText] = useState<string | null>(null);
  const [feeErr, setFeeErr] = useState<string>();

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
  const counting = countingOf(data);
  const rules = data.settings.stayRules;
  const totalIf = (b: Booking, e: Ending) => bookingTotal(e === "today" ? { ...b, checkOut: endToday(b) } : b, cage(b), counting);
  const dueIf = (b: Booking, e: Ending) => Math.max(0, totalIf(b, e) - paidAmount(b));
  /** The late fee the hotel's rules give for a pick-up today at `at`, with the stay ending as chosen. */
  const feeIf = (b: Booking, e: Ending, at: string) => {
    const [hh, mm] = /^\d{2}:\d{2}$/.test(at) ? at.split(":").map(Number) : [NaN, NaN];
    const [y, m, d] = today.split("-").map(Number);
    const pickedUp = new Date(y, m - 1, d, hh, mm);
    const dayRate = nightlyRate(b, cage(b)) * (isShared(cage(b)) ? stayPetIds(b).length : 1);
    if (Number.isNaN(pickedUp.getTime())) return null;
    return lateFee({ checkOut: e === "today" ? endToday(b) : b.checkOut, arrivalAt: b.arrival?.at }, pickedUp, dayRate, rules);
  };

  const request = (b: Booking) => {
    const differs = endToday(b) !== b.checkOut;
    const now = clockNow();
    const fee = feeIf(b, differs ? "today" : "booked", now);
    if (!differs && dueIf(b, "booked") === 0 && !(fee && fee.amount > 0)) {
      checkOut(b.id);
      return;
    }
    setTime(now);
    setFeeOn(true);
    setFeeText(null);
    setFeeErr(undefined);
    setTaken(false);
    setEnding(differs ? "today" : "booked");
    setBooking(b);
  };

  function confirm() {
    if (!booking) return;
    let lateCharge: { label: string; amount: number } | undefined;
    if (charging) {
      const err = moneyError(t.validation, locale, feeShown);
      if (err) return void setFeeErr(err);
      lateCharge = { label: c.lateLabel, amount: parseRupiah(feeShown) ?? 0 };
    }
    const issues = checkOut(booking.id, ending === "today" ? endToday(booking) : undefined, lateCharge);
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
  const fee = b ? feeIf(b, ending, time) : null;
  // The fee as typed, or as the rules give it until the operator changes it.
  const feeShown = feeText ?? String(fee?.amount ?? 0);
  const charging = !!fee && fee.amount > 0 && feeOn;
  const due = (b ? dueIf(b, ending) : 0) + (charging ? (parseRupiah(feeShown) ?? 0) : 0);

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
                <span>{late ? c.addNights(nights(b.checkOut, endToday(b)), rp(totalIf(b, "today"))) : c.endToday(stayDays({ checkIn: b.checkIn, checkOut: endToday(b) }, counting), rp(totalIf(b, "today")))}</span>
              </label>
              <label className="ds-check">
                <input type="radio" name="checkout-end" checked={ending === "booked"} onChange={() => setEnding("booked")} />
                <span>{c.keepDates(rp(totalIf(b, "booked")))}</span>
              </label>
            </fieldset>
          )}
          {taken && <Alert tone="warn">{c.taken}</Alert>}
          {rules.late.mode !== "none" && (
            <Field label={c.pickedUpAt}>
              <Input type="time" value={time} onChange={(e) => (setTime(e.target.value), setFeeText(null), setFeeErr(undefined))} />
            </Field>
          )}
          {fee && fee.amount > 0 && (
            <fieldset className="ds-flowform__choices">
              <legend>{c.lateBy(fee.minutesLate, rules.counting === "hours24" && b.arrival ? timeOfDay(b.arrival.at) : rules.pickUpUntil)}</legend>
              <label className="ds-check">
                <input type="checkbox" checked={feeOn} onChange={(e) => (setFeeOn(e.target.checked), setFeeErr(undefined))} />
                <span>{c.lateAdd}</span>
              </label>
              {feeOn && (
                <Field label={c.lateAmount} error={feeErr}>
                  <MoneyInput value={feeShown} onChange={(e) => (setFeeText(e.target.value), setFeeErr(undefined))} />
                </Field>
              )}
            </fieldset>
          )}
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
