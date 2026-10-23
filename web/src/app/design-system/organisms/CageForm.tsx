import { useState, type FormEvent } from "react";
import type { Cage, CageSize } from "@/app/domain/types";
import { SIZE_ORDER } from "@/app/domain/logic";
import { Button } from "@/app/design-system/atoms/Button";
import { MoneyInput } from "@/app/design-system/atoms/MoneyInput";
import { Input, Select } from "@/app/design-system/atoms/Input";
import { Heading } from "@/app/design-system/atoms/Text";
import { Field } from "@/app/design-system/molecules/Field";
import { useAppT } from "@/app/i18n/useAppT";
import { compact, intError, moneyError, textError, without } from "@/app/forms/messages";
import { useFocusInvalid } from "@/shared/hooks/useFocusInvalid";
import { LIMITS, parseRupiah } from "@/shared/lib/validate";
import "./organisms.css";

/** The most pets one shared room can be set to hold. */
const MAX_PLACES = 50;

export function CageForm({
  cage,
  onSubmit,
  onCancel,
  onDelete,
}: {
  cage?: Cage;
  onSubmit: (draft: Omit<Cage, "id">) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const { t, locale } = useAppT();
  const c = t.cages;
  const v = t.validation;
  const { ref, focusInvalid } = useFocusInvalid();
  const [name, setName] = useState(cage?.name ?? "");
  const [size, setSize] = useState<CageSize>(cage?.size ?? "M");
  const [price, setPrice] = useState(String(cage?.pricePerNight ?? 75000));
  const [shared, setShared] = useState((cage?.capacity ?? 1) > 1);
  const [capacity, setCapacity] = useState(String(Math.max(2, cage?.capacity ?? 6)));
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit(e: FormEvent) {
    e.preventDefault();
    const p = parseRupiah(price) ?? 0;
    const places = parseInt(capacity.trim(), 10);
    const err = compact({
      name: textError(v, name, { required: c.errName, ...LIMITS.unitName }),
      price: moneyError(v, locale, price, { required: true, zero: c.errPrice }),
      capacity: shared ? (/^\d+$/.test(capacity.trim()) && places < 2 ? c.errCapacity : intError(v, capacity, 2, MAX_PLACES)) : undefined,
    });
    setErrors(err);
    if (Object.keys(err).length) return void focusInvalid();
    onSubmit({ name: name.trim(), size, pricePerNight: p, capacity: shared ? places : 1, archived: false });
  }

  return (
    <form ref={ref} className="ds-form ds-form--panel" onSubmit={submit} noValidate>
      <Heading level={2} size="md">{cage ? c.editTitle : c.newTitle}</Heading>
      <div className="ds-form__row">
        <Field label={c.name} error={errors.name}>
          <Input value={name} onChange={(e) => (setName(e.target.value), setErrors((x) => without(x, "name")))} placeholder="M-05" autoFocus />
        </Field>
        <Field label={c.size}>
          <Select value={size} onChange={(e) => setSize(e.target.value as CageSize)}>
            {SIZE_ORDER.map((s) => (
              <option key={s} value={s}>
                {t.common.sizes[s]}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="ds-form__row">
        <Field label={c.kind}>
          <Select value={shared ? "shared" : "single"} onChange={(e) => setShared(e.target.value === "shared")}>
            <option value="single">{c.kinds.single}</option>
            <option value="shared">{c.kinds.shared}</option>
          </Select>
        </Field>
        {shared && (
          <Field label={c.capacity} error={errors.capacity}>
            <Input value={capacity} onChange={(e) => (setCapacity(e.target.value), setErrors((x) => without(x, "capacity")))} inputMode="numeric" />
          </Field>
        )}
      </div>
      <Field label={shared ? c.priceShared : c.price} error={errors.price}>
        <MoneyInput value={price} onChange={(e) => (setPrice(e.target.value), setErrors((x) => without(x, "price")))} />
      </Field>
      <div className="ds-form__actions">
        {onDelete && (
          <Button variant="danger" icon="trash" onClick={onDelete}>
            {t.common.delete}
          </Button>
        )}
        <span className="ds-form__spacer" />
        <Button variant="secondary" onClick={onCancel}>
          {t.common.cancel}
        </Button>
        <Button type="submit" icon="check">
          {t.common.save}
        </Button>
      </div>
    </form>
  );
}
