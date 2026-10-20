import type { Pet } from "@/app/domain/types";
import { Checkbox } from "@/app/design-system/atoms/Checkbox";
import { Muted } from "@/app/design-system/atoms/Text";
import { useAppT } from "@/app/i18n/useAppT";
import "./molecules.css";

/** The other pets of the owner that can share the cage: tick the ones staying together. Renders nothing when there are none. */
export function CompanionPicker({ pets, value, onChange, error }: { pets: Pet[]; value: string[]; onChange: (ids: string[]) => void; error?: string }) {
  const { t } = useAppT();
  if (!pets.length) return null;
  return (
    <fieldset className="ds-companions">
      <legend>{t.bookingForm.companions}</legend>
      {pets.map((p) => (
        <Checkbox key={p.id} label={`${p.name} · ${t.common.species[p.species]}`} checked={value.includes(p.id)} onChange={(e) => onChange(e.target.checked ? [...value, p.id] : value.filter((x) => x !== p.id))} />
      ))}
      <Muted>{t.bookingForm.companionsHint}</Muted>
      {error && (
        <p className="ds-field__error" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
