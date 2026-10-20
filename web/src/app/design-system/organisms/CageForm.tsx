import { useState, type FormEvent } from "react";
import type { Cage, CageSize } from "@/app/domain/types";
import { SIZE_ORDER } from "@/app/domain/logic";
import { Button } from "@/app/design-system/atoms/Button";
import { Input, Select } from "@/app/design-system/atoms/Input";
import { Heading } from "@/app/design-system/atoms/Text";
import { Field } from "@/app/design-system/molecules/Field";
import { useAppT } from "@/app/i18n/useAppT";
import "./organisms.css";

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
  const { t } = useAppT();
  const c = t.cages;
  const [name, setName] = useState(cage?.name ?? "");
  const [size, setSize] = useState<CageSize>(cage?.size ?? "M");
  const [price, setPrice] = useState(String(cage?.pricePerNight ?? 75000));
  const [shared, setShared] = useState((cage?.capacity ?? 1) > 1);
  const [capacity, setCapacity] = useState(String(Math.max(2, cage?.capacity ?? 6)));
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit(e: FormEvent) {
    e.preventDefault();
    const p = parseInt(price.replace(/\D/g, "") || "0", 10);
    const err: Record<string, string> = {};
    if (!name.trim()) err.name = c.errName;
    if (!(p > 0)) err.price = c.errPrice;
    const places = parseInt(capacity.replace(/\D/g, "") || "0", 10);
    if (shared && !(places >= 2)) err.capacity = c.errCapacity;
    setErrors(err);
    if (Object.keys(err).length) return;
    onSubmit({ name: name.trim(), size, pricePerNight: p, capacity: shared ? places : 1 });
  }

  return (
    <form className="ds-form ds-form--panel" onSubmit={submit} noValidate>
      <Heading level={2} size="md">{cage ? c.editTitle : c.newTitle}</Heading>
      <div className="ds-form__row">
        <Field label={c.name} error={errors.name}>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="M-05" autoFocus />
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
            <Input value={capacity} onChange={(e) => setCapacity(e.target.value)} inputMode="numeric" />
          </Field>
        )}
      </div>
      <Field label={shared ? c.priceShared : c.price} error={errors.price}>
        <Input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="numeric" />
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
