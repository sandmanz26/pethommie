import { useState, type FormEvent } from "react";
import { busiestNight, formatRupiah, poolCage, poolUnit, todayISO } from "@/app/domain/logic";
import { useStore } from "@/app/store/AppStore";
import { useAppT } from "@/app/i18n/useAppT";
import { Button } from "@/app/design-system/atoms/Button";
import { MoneyInput } from "@/app/design-system/atoms/MoneyInput";
import { Input } from "@/app/design-system/atoms/Input";
import { Alert } from "@/app/design-system/molecules/Alert";
import { Field } from "@/app/design-system/molecules/Field";
import { PageHeader } from "@/app/design-system/organisms/PageHeader";
import { hasIssues, poolIssues, SETUP_LIMITS } from "./onboardingRules";
import "./pages.css";

const digits = (text: string) => parseInt(text.replace(/\D/g, "") || "0", 10);

/** A hotel without cages or rooms: what stands in for the units page is its capacity and price per pet. */
export function CapacityPage() {
  const { data, saveCage } = useStore();
  const { t, locale } = useAppT();
  const p = t.pool;
  const o = t.onboarding.cages;
  const pool = poolUnit(data);
  const [capacity, setCapacity] = useState(String(pool?.capacity ?? 10));
  const [price, setPrice] = useState(String(pool?.pricePerNight ?? 60_000));
  const [tried, setTried] = useState(false);
  const [saved, setSaved] = useState(false);

  const draft = { capacity: digits(capacity), price: digits(price) };
  const booked = pool ? busiestNight(data, pool.id, todayISO()) : 0;
  const issues = poolIssues(draft, booked);
  const [minPrice, maxPrice] = SETUP_LIMITS.price;
  const capacityError = !tried ? undefined : issues.capacity === "range" ? p.errCapacity(...SETUP_LIMITS.capacity) : issues.capacity === "booked" ? p.errBelowBooked(booked) : undefined;
  const priceError = !tried ? undefined : issues.price === "low" ? o.errPriceLow(formatRupiah(minPrice, locale)) : issues.price === "high" ? o.errPriceHigh(formatRupiah(maxPrice, locale)) : undefined;

  function save(e: FormEvent) {
    e.preventDefault();
    setTried(true);
    setSaved(false);
    if (hasIssues(issues)) return;
    saveCage(pool ? { ...pool, capacity: draft.capacity, pricePerNight: draft.price } : poolCage(draft.capacity, draft.price, p.unitName));
    setSaved(true);
  }

  return (
    <>
      <PageHeader art="app-cage" title={p.title} lead={p.lead} />
      <form className="ds-form ds-form--panel" onSubmit={save} noValidate aria-label={p.title}>
        <div className="ds-form__row">
          <Field label={p.capacity} error={capacityError}>
            <Input name="capacity" inputMode="numeric" value={capacity} onChange={(e) => (setCapacity(e.target.value), setSaved(false))} />
          </Field>
          <Field label={p.price} hint={formatRupiah(draft.price, locale)} error={priceError}>
            <MoneyInput name="price" value={price} onChange={(e) => (setPrice(e.target.value), setSaved(false))} />
          </Field>
        </div>
        {saved && <Alert tone="ok">{p.saved}</Alert>}
        <div className="ds-form__actions">
          <Button type="submit" icon="check">
            {p.save}
          </Button>
        </div>
      </form>
    </>
  );
}
