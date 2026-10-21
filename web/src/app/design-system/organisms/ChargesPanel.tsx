import { useState, type FormEvent } from "react";
import type { Booking, Cage } from "@/app/domain/types";
import { CHARGE_SUGGESTIONS, type ChargeIssue } from "@/app/domain/charges";
import { bookingTotal, formatRupiah, nightlyRate, nights } from "@/app/domain/logic";
import { Button } from "@/app/design-system/atoms/Button";
import { Input, Select } from "@/app/design-system/atoms/Input";
import { Heading, Muted } from "@/app/design-system/atoms/Text";
import { Field } from "@/app/design-system/molecules/Field";
import { useAppT } from "@/app/i18n/useAppT";
import "./organisms.css";

/** What the stay costs: the nights, then every add-on and discount, and the total. Add and remove lines here. */
export function ChargesPanel({
  booking,
  cage,
  onAdd,
  onRemove,
}: {
  booking: Booking;
  cage: Cage | undefined;
  /** Omit for a stay whose price can't change. */
  onAdd?: (charge: { label: string; amount: number }) => ChargeIssue[];
  onRemove?: (id: string) => void;
}) {
  const { t, locale } = useAppT();
  const c = t.charges;
  const rp = (n: number) => formatRupiah(n, locale);
  const n = Math.max(0, nights(booking.checkIn, booking.checkOut));
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [kind, setKind] = useState<"addon" | "discount">("addon");
  const [errors, setErrors] = useState<{ label?: string; amount?: string }>({});

  function submit(e: FormEvent) {
    e.preventDefault();
    const digits = parseInt(amount.replace(/\D/g, "") || "0", 10);
    const issues = onAdd?.({ label, amount: kind === "discount" ? -digits : digits }) ?? [];
    if (issues.length) {
      setErrors({ label: issues.includes("label") ? c.errLabel : undefined, amount: issues.includes("amount") ? c.errAmount : undefined });
      return;
    }
    setLabel("");
    setAmount("");
    setErrors({});
  }

  return (
    <section className="ds-panel" aria-labelledby="charges-title">
      <div>
        <Heading level={2} size="md">
          <span id="charges-title">{c.title}</span>
        </Heading>
        <Muted>{c.lead}</Muted>
      </div>
      <ul className="ds-paylist">
        <li>
          <span>{cage ? c.nights(n, rp(nightlyRate(booking, cage)), rp(n * nightlyRate(booking, cage))) : "—"}</span>
        </li>
        {booking.charges.map((x) => (
          <li key={x.id}>
            <span>
              <b>{x.label}</b>
              <small>{x.amount < 0 ? `${c.kind.discount}: ${rp(x.amount)}` : rp(x.amount)}</small>
            </span>
            {onRemove && <Button variant="ghost" size="sm" icon="trash" aria-label={`${c.remove}: ${x.label}`} onClick={() => onRemove(x.id)} />}
          </li>
        ))}
        {booking.charges.length === 0 && (
          <li>
            <Muted>{c.none}</Muted>
          </li>
        )}
        <li className="ds-paylist__total">
          <span>
            <b>{c.total}</b>
          </span>
          <b>{rp(bookingTotal(booking, cage))}</b>
        </li>
      </ul>

      {onAdd ? (
        <form className="ds-form" onSubmit={submit} noValidate aria-label={c.title}>
          <div className="ds-form__row">
            <Field label={c.label} error={errors.label}>
              <Input list="charge-suggestions" value={label} onChange={(e) => (setLabel(e.target.value), setErrors({}))} placeholder={c.labelPh} />
            </Field>
            <Field label={c.amount} error={errors.amount}>
              <Input value={amount} onChange={(e) => (setAmount(e.target.value), setErrors({}))} inputMode="numeric" placeholder="0" />
            </Field>
          </div>
          <datalist id="charge-suggestions">
            {CHARGE_SUGGESTIONS[locale].map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <div className="ds-form__actions">
            <Select aria-label={`${c.kind.addon} / ${c.kind.discount}`} value={kind} onChange={(e) => setKind(e.target.value as "addon" | "discount")} className="ds-form__kind">
              <option value="addon">{c.kind.addon}</option>
              <option value="discount">{c.kind.discount}</option>
            </Select>
            <Button type="submit" icon="plus">
              {c.add}
            </Button>
          </div>
        </form>
      ) : (
        <Muted>{c.locked}</Muted>
      )}
    </section>
  );
}
