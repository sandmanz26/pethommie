import { Link } from "react-router-dom";
import { useState, type FormEvent } from "react";
import type { Booking, Cage, Payment, PaymentKind, PaymentMethod, StayCounting } from "@/app/domain/types";
import { bookingTotal, formatRupiah, timeOf, dayOf, formatDate } from "@/app/domain/logic";
import { balanceDue, paidAmount, paymentStatus, type PaymentIssue } from "@/app/domain/payments";
import { Badge, type Tone } from "@/app/design-system/atoms/Badge";
import { Button } from "@/app/design-system/atoms/Button";
import { MoneyInput } from "@/app/design-system/atoms/MoneyInput";
import { Input, Select } from "@/app/design-system/atoms/Input";
import { Heading, Muted } from "@/app/design-system/atoms/Text";
import { Field } from "@/app/design-system/molecules/Field";
import { Alert } from "@/app/design-system/molecules/Alert";
import { useAppT } from "@/app/i18n/useAppT";
import { compact, moneyError, textError } from "@/app/forms/messages";
import { useFocusInvalid } from "@/shared/hooks/useFocusInvalid";
import { LIMITS, parseRupiah } from "@/shared/lib/validate";
import "./organisms.css";

const statusTone: Record<"unpaid" | "partial" | "paid", Tone> = { unpaid: "danger", partial: "warn", paid: "ok" };

/** What a stay costs, what has been received, and a form to record more. Money is entered by hand. */
export function PaymentsPanel({
  booking,
  cage,
  onAdd,
  onRemove,
  simple,
  counting = "nights",
}: {
  booking: Booking;
  cage: Cage | undefined;
  /** Returns what was wrong, if anything. Omit for a stay that can't take payments. */
  onAdd?: (payment: Omit<Payment, "id">) => PaymentIssue[];
  onRemove?: (paymentId: string) => void;
  /** Simple mode: no note, and one tap records the whole balance. */
  simple?: boolean;
  /** How the hotel counts days (settings.stayRules.counting). */
  counting?: StayCounting;
}) {
  const { t, locale } = useAppT();
  const p = t.payments;
  const cancelled = booking.status === "cancelled";
  const total = bookingTotal(booking, cage, counting);
  const kept = paidAmount(booking);
  // Paid more than the stay costs: the difference is the owner's, to give back or carry to the next stay.
  const over = cancelled ? 0 : Math.max(0, kept - total);
  const balance = balanceDue(booking, cage, counting);
  const status = paymentStatus(booking, cage, counting);
  const rp = (n: number) => formatRupiah(n, locale);

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("transfer");
  const [kind, setKind] = useState<PaymentKind>(booking.status === "cancelled" ? "refund" : booking.status === "booked" ? "deposit" : "payment");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Partial<Record<"amount" | "reference" | "note", string>>>({});
  const v = t.validation;
  const { ref, focusInvalid } = useFocusInvalid();

  function payInFull() {
    onAdd?.({ at: new Date().toISOString(), amount: balance, method, kind: "payment", reference: "", note: "" });
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const local = compact({
      amount: moneyError(v, locale, amount, { required: true, zero: p.errAmount }),
      reference: textError(v, reference, { max: LIMITS.short }),
      note: textError(v, note, { max: LIMITS.line }),
    });
    if (Object.keys(local).length) return void (setErrors(local), focusInvalid());
    const digits = parseRupiah(amount) ?? 0;
    const issues = onAdd?.({ at: new Date().toISOString(), amount: digits, method, kind, reference: reference.trim(), note: note.trim() }) ?? [];
    if (issues.length) return void (setErrors({ amount: issues.includes("refund") ? p.errRefund : p.errAmount }), focusInvalid());
    setAmount("");
    setReference("");
    setNote("");
    setErrors({});
  }

  return (
    <section className="ds-panel" aria-labelledby="payments-title">
      <div className="ds-panel__head">
        <span className="ds-panel__title">
          <Heading level={2} size="md">
            <span id="payments-title">{p.title}</span>
          </Heading>
        </span>
        {!cancelled && <Badge tone={statusTone[status]}>{p.status[status]}</Badge>}
      </div>
      {cancelled ? (
        <p className="ds-muted">{p.cancelledKept(rp(kept))}</p>
      ) : (
      <dl className="ds-money">
        <div>
          <dt>{p.total}</dt>
          <dd>{rp(total)}</dd>
        </div>
        <div>
          <dt>{p.paid}</dt>
          <dd>{rp(paidAmount(booking))}</dd>
        </div>
        <div>
          <dt>{p.balance}</dt>
          <dd className={balance > 0 ? "is-due" : ""}>{rp(balance)}</dd>
        </div>
      </dl>
      )}
      {over > 0 && (
        <Alert tone="warn">
          {p.overpaid(rp(over))}{" "}
          {onAdd && (
            <Button size="sm" variant="secondary" onClick={() => (setKind("refund"), setAmount(String(over)))}>
              {p.refundOver}
            </Button>
          )}
        </Alert>
      )}

      {booking.payments.length ? (
        <ul className="ds-paylist">
          {booking.payments.map((x) => (
            <li key={x.id} className={x.kind === "refund" ? "is-refund" : ""}>
              <span>
                <b>{x.kind === "refund" ? `− ${rp(x.amount)}` : rp(x.amount)}</b>
                <small>
                  {p.kinds[x.kind]} · {p.methods[x.method]} · {formatDate(dayOf(x.at), locale, { day: "numeric", month: "short" })} {timeOf(x.at, locale)}
                  {x.reference && ` · ${x.reference}`}
                  {x.note && ` · ${x.note}`}
                </small>
              </span>
              <Link className="ds-paylist__receipt" to={`/app/receipts/${booking.id}/${x.id}`}>
                {p.receipt}
              </Link>
              {onRemove && <Button variant="ghost" size="sm" icon="trash" aria-label={`${p.remove} ${rp(x.amount)}`} onClick={() => onRemove(x.id)} />}
            </li>
          ))}
        </ul>
      ) : (
        <Muted>{p.none}</Muted>
      )}

      {onAdd && (!cancelled || kept > 0) && (
        <form ref={ref} className="ds-form" onSubmit={submit} noValidate aria-label={p.add}>
          <div className="ds-form__row">
            <Field label={p.amount} error={errors.amount}>
              <MoneyInput value={amount} onChange={(e) => (setAmount(e.target.value), setErrors((x) => ({ ...x, amount: undefined })))} placeholder="0" />
            </Field>
            <Field label={p.method}>
              <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                {(["transfer", "qris", "cash", "ewallet", "card"] as PaymentMethod[]).map((m) => (
                  <option key={m} value={m}>
                    {p.methods[m]}
                  </option>
                ))}
              </Select>
            </Field>
            {!simple && !cancelled && (
              <Field label={p.kind}>
                <Select value={kind} onChange={(e) => setKind(e.target.value as PaymentKind)}>
                  {(["deposit", "payment", "refund"] as PaymentKind[]).map((k) => (
                    <option key={k} value={k}>
                      {p.kinds[k]}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
          </div>
          {!simple && (
            <div className="ds-form__row">
              <Field label={p.reference} error={errors.reference} optional={t.common.optional}>
                <Input value={reference} onChange={(e) => (setReference(e.target.value), setErrors((x) => ({ ...x, reference: undefined })))} placeholder={p.referencePh} />
              </Field>
              <Field label={p.note} error={errors.note} optional={t.common.optional}>
                <Input value={note} onChange={(e) => (setNote(e.target.value), setErrors((x) => ({ ...x, note: undefined })))} placeholder={p.notePh} />
              </Field>
            </div>
          )}
          <Muted>{p.hint}</Muted>
          <div className="ds-form__actions">
            <Button type="submit" icon="check">
              {cancelled ? p.saveRefund : p.save}
            </Button>
            {!cancelled && balance > 0 &&
              (simple ? (
                <Button variant="secondary" onClick={payInFull}>
                  {p.paidInFull}
                </Button>
              ) : (
                <Button variant="secondary" onClick={() => setAmount(String(balance))}>
                  {p.payBalance}
                </Button>
              ))}
          </div>
        </form>
      )}
    </section>
  );
}
