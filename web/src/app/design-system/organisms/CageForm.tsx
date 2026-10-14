import { useState, type FormEvent } from "react";
import type { Cage, CageSize } from "../../domain/types";
import { SIZE_ORDER } from "../../domain/logic";
import { Button } from "../atoms/Button";
import { Input, Select } from "../atoms/Input";
import { Heading } from "../atoms/Text";
import { Field } from "../molecules/Field";
import { useAppT } from "../../i18n/useAppT";
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
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit(e: FormEvent) {
    e.preventDefault();
    const p = parseInt(price.replace(/\D/g, "") || "0", 10);
    const err: Record<string, string> = {};
    if (!name.trim()) err.name = c.errName;
    if (!(p > 0)) err.price = c.errPrice;
    setErrors(err);
    if (Object.keys(err).length) return;
    onSubmit({ name: name.trim(), size, pricePerNight: p });
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
      <Field label={c.price} error={errors.price}>
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
