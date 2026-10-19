import { useState, type FormEvent } from "react";
import type { Booking, Cage, Payment, PaymentMethod } from "@/app/domain/types";
import { bookingTotal, formatRupiah, timeOf, dayOf, formatDate } from "@/app/domain/logic";
import { balanceDue, paidAmount, paymentStatus, type PaymentIssue } from "@/app/domain/payments";
import { Badge, type Tone } from "@/app/design-system/atoms/Badge";
import { Button } from "@/app/design-system/atoms/Button";
import { Input, Select } from "@/app/design-system/atoms/Input";
import { Heading, Muted } from "@/app/design-system/atoms/Text";
import { Field } from "@/app/design-system/molecules/Field";
import { useAppT } from "@/app/i18n/useAppT";
import "./organisms.css";

const statusTone: Record<"unpaid" | "partial" | "paid", Tone> = { unpaid: "danger", partial: "warn", paid: "ok" };

/** What a stay costs, what has been received, and a form to record more. Money is entered by hand. */
export function PaymentsPanel({
  booking,
  cage,
  onAdd,
  onRemove,
}: {
  booking: Booking;
  cage: Cage | undefined;
  /** Returns what was wrong, if anything. Omit for a stay that can't take payments. */
  onAdd?: (payment: Omit<Payment, "id">) => PaymentIssue[];
  onRemove?: (paymentId: string) => void;
}) {
  const { t, locale } = useAppT();
  const p = t.payments;
  const total = bookingTotal(booking, cage);
  const balance = balanceDue(booking, cage);
  const status = paymentStatus(booking, cage);
  const rp = (n: number) => formatRupiah(n, locale);

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("transfer");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | undefined>();

  function submit(e: FormEvent) {
    e.preventDefault();
    const digits = parseInt(amount.replace(/\D/g, "") || "0", 10);
    const issues = onAdd?.({ at: new Date().toISOString(), amount: digits, method, note: note.trim() }) ?? [];
    if (issues.length) return setError(p.errAmount);
    setAmount("");
    setNote("");
    setError(undefined);
  }

  return (
    <section className="ds-panel" aria-labelledby="payments-title">
      <div className="ds-panel__head">
        <Heading level={2} size="md">
          <span id="payments-title">{p.title}</span>
        </Heading>
        <Badge tone={statusTone[status]}>{p.status[status]}</Badge>
      </div>
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

      {booking.payments.length ? (
        <ul className="ds-paylist">
          {booking.payments.map((x) => (
            <li key={x.id}>
              <span>
                <b>{rp(x.amount)}</b>
                <small>
                  {p.methods[x.method]} · {formatDate(dayOf(x.at), locale, { day: "numeric", month: "short" })} {timeOf(x.at, locale)}
                  {x.note && ` · ${x.note}`}
                </small>
              </span>
              {onRemove && <Button variant="ghost" size="sm" icon="trash" aria-label={`${p.remove} ${rp(x.amount)}`} onClick={() => onRemove(x.id)} />}
            </li>
          ))}
        </ul>
      ) : (
        <Muted>{p.none}</Muted>
      )}

      {onAdd && (
        <form className="ds-form" onSubmit={submit} noValidate aria-label={p.add}>
          <div className="ds-form__row">
            <Field label={p.amount} error={error}>
              <Input value={amount} onChange={(e) => (setAmount(e.target.value), setError(undefined))} inputMode="numeric" placeholder="0" />
            </Field>
            <Field label={p.method}>
              <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                {(["transfer", "qris", "cash"] as PaymentMethod[]).map((m) => (
                  <option key={m} value={m}>
                    {p.methods[m]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label={p.note} optional={t.common.optional}>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={p.notePh} />
          </Field>
          <Muted>{p.hint}</Muted>
          <div className="ds-form__actions">
            <Button type="submit" icon="check">
              {p.save}
            </Button>
            {balance > 0 && (
              <Button variant="secondary" onClick={() => setAmount(String(balance))}>
                {p.payBalance}
              </Button>
            )}
          </div>
        </form>
      )}
    </section>
  );
}
