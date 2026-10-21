import { useEffect, useRef, useState } from "react";
import { formatRupiah, todayISO } from "@/app/domain/logic";
import { paidAmount } from "@/app/domain/payments";
import type { Booking, CancelReason, PaymentMethod } from "@/app/domain/types";
import { useStore } from "@/app/store/AppStore";
import { useAppT } from "@/app/i18n/useAppT";
import { Button } from "@/app/design-system/atoms/Button";
import { Input, Select } from "@/app/design-system/atoms/Input";
import { Field } from "@/app/design-system/molecules/Field";

type Money = "keep" | "all" | "part";
const METHODS: PaymentMethod[] = ["transfer", "cash", "qris", "ewallet", "card"];

/**
 * Cancelling a booking, done properly: why (owner, no-show, hotel), and what happens to money already paid (kept as
 * a cancellation fee, given back in full or in part). Its invoice is voided. Render `dialog` once; call
 * `request(booking, reason?)` from any button.
 */
export function useCancelBooking() {
  const { data, cancelBooking } = useStore();
  const { t, locale } = useAppT();
  const c = t.cancelFlow;
  const ref = useRef<HTMLDialogElement>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [reason, setReason] = useState<CancelReason>("owner");
  const [money, setMoney] = useState<Money>("keep");
  const [part, setPart] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("transfer");
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (booking && !d.open) d.showModal?.();
    if (!booking && d.open) d.close();
  }, [booking]);

  const request = (b: Booking, why: CancelReason = "owner") => {
    setBooking(b);
    setReason(why);
    // A no-show usually forfeits the deposit; a hotel cancellation gives everything back.
    setMoney(why === "hotel" ? "all" : "keep");
    setPart("");
    setError(undefined);
  };

  const paid = booking ? paidAmount(booking) : 0;
  const rp = (n: number) => formatRupiah(n, locale);
  const invoice = booking ? data.invoices.find((i) => i.bookingId === booking.id && i.status === "issued") : undefined;
  const refund = money === "all" ? paid : money === "part" ? parseInt(part.replace(/\D/g, "") || "0", 10) : 0;

  function confirm() {
    if (!booking) return;
    const issues = cancelBooking(booking.id, { reason, refund, method, on: todayISO(), at: new Date().toISOString() });
    if (issues.length) return setError(c.errRefund);
    setBooking(null);
  }

  const dialog = (
    <dialog ref={ref} className="ds-dialog ds-dialog--form" aria-labelledby="cancel-title" onCancel={(e) => (e.preventDefault(), setBooking(null))}>
      {booking && (
        <div className="ds-flowform">
          <h2 id="cancel-title">{c.title}</h2>
          <Field label={c.reason}>
            <Select value={reason} onChange={(e) => setReason(e.target.value as CancelReason)}>
              {(["owner", "no_show", "hotel"] as const).map((r) => (
                <option key={r} value={r}>
                  {c.reasons[r]}
                </option>
              ))}
            </Select>
          </Field>
          <p className="ds-flowform__note">{paid > 0 ? c.paid(rp(paid)) : c.nothingPaid}</p>
          {paid > 0 && (
            <fieldset className="ds-flowform__choices">
              <legend>{c.money}</legend>
              {(["keep", "all", "part"] as const).map((m) => (
                <label key={m} className="ds-check">
                  <input type="radio" name="cancel-money" checked={money === m} onChange={() => setMoney(m)} />
                  <span>{m === "keep" ? c.keepAll : m === "all" ? `${c.refundAll} (${rp(paid)})` : c.refundPart}</span>
                </label>
              ))}
            </fieldset>
          )}
          {money === "part" && paid > 0 && (
            <Field label={c.amount} error={error}>
              <Input value={part} onChange={(e) => setPart(e.target.value)} inputMode="numeric" placeholder="0" />
            </Field>
          )}
          {refund > 0 && (
            <Field label={c.method}>
              <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                {METHODS.map((m) => (
                  <option key={m} value={m}>
                    {t.payments.methods[m]}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          {error && money !== "part" && (
            <p className="ds-field__error" role="alert">
              {error}
            </p>
          )}
          <p className="ds-flowform__note">
            {c.freed}
            {invoice && ` ${c.invoiceVoided(invoice.number)}`}
          </p>
          <div className="ds-dialog__actions">
            <Button variant="secondary" onClick={() => setBooking(null)}>
              {c.back}
            </Button>
            <Button variant="danger" onClick={confirm}>
              {c.confirm}
            </Button>
          </div>
        </div>
      )}
    </dialog>
  );
  return { request, dialog };
}
