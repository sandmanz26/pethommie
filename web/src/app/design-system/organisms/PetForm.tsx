import { useState, type FormEvent } from "react";
import type { Owner, Pet, Species } from "@/app/domain/types";
import { formatWhatsapp, normaliseWhatsapp } from "@/shared/lib/phone";
import { Button } from "@/app/design-system/atoms/Button";
import { Input, Select, Textarea } from "@/app/design-system/atoms/Input";
import { Heading } from "@/app/design-system/atoms/Text";
import { Field } from "@/app/design-system/molecules/Field";
import { useAppT } from "@/app/i18n/useAppT";
import { compact, dateError, textError, without } from "@/app/forms/messages";
import { useFocusInvalid } from "@/shared/hooks/useFocusInvalid";
import { LIMITS } from "@/shared/lib/validate";
import "./organisms.css";

export type PetDraft = Omit<Pet, "id" | "ownerId">;
export type OwnerDraft = Omit<Owner, "id" | "language">;

const SPECIES: Species[] = ["cat", "dog", "rabbit", "other"];

/** Pet + owner in one form, since operators always get both at the counter. */
export function PetForm({
  pet,
  owner,
  submitLabel,
  onSubmit,
  onCancel,
  extraActions,
}: {
  pet?: Pet;
  owner?: Owner;
  submitLabel: string;
  onSubmit: (pet: PetDraft, owner: OwnerDraft) => void;
  onCancel?: () => void;
  extraActions?: React.ReactNode;
}) {
  const { t } = useAppT();
  const f = t.petForm;
  const v = t.validation;
  const { ref, focusInvalid } = useFocusInvalid();
  const [name, setName] = useState(pet?.name ?? "");
  const [species, setSpecies] = useState<Species>(pet?.species ?? "cat");
  const [breed, setBreed] = useState(pet?.breed ?? "");
  const [vaccineExpiry, setVaccine] = useState(pet?.vaccineExpiry ?? "");
  const [notes, setNotes] = useState(pet?.notes ?? "");
  const [ownerName, setOwnerName] = useState(owner?.name ?? "");
  const [wa, setWa] = useState(owner?.whatsapp ? formatWhatsapp(owner.whatsapp) : "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit(e: FormEvent) {
    e.preventDefault();
    const normalised = wa.trim() ? normaliseWhatsapp(wa) : "";
    const err = compact({
      name: textError(v, name, { required: f.errName, ...LIMITS.petName }),
      breed: textError(v, breed, { max: LIMITS.petName.max }),
      vaccine: dateError(v, vaccineExpiry, false),
      notes: textError(v, notes, { max: LIMITS.notes }),
      owner: textError(v, ownerName, { required: f.errOwner, ...LIMITS.personName }),
      wa: normalised === null ? f.errWhatsapp : undefined,
    });
    setErrors(err);
    if (Object.keys(err).length) return void focusInvalid();
    onSubmit(
      { name: name.trim(), species, breed: breed.trim(), vaccineExpiry, notes: notes.trim() },
      { name: ownerName.trim(), whatsapp: normalised ?? "" },
    );
  }

  return (
    <form ref={ref} className="ds-form" onSubmit={submit} noValidate>
      <fieldset className="ds-form__section">
        <Heading level={2} size="sm">{f.petSection}</Heading>
        <Field label={f.name} error={errors.name}>
          <Input value={name} onChange={(e) => (setName(e.target.value), setErrors((x) => without(x, "name")))} placeholder={f.namePh} autoFocus={!pet} />
        </Field>
        <div className="ds-form__row">
          <Field label={f.species}>
            <Select value={species} onChange={(e) => setSpecies(e.target.value as Species)}>
              {SPECIES.map((s) => (
                <option key={s} value={s}>
                  {t.common.species[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={f.breed} error={errors.breed} optional={t.common.optional}>
            <Input value={breed} onChange={(e) => (setBreed(e.target.value), setErrors((x) => without(x, "breed")))} placeholder={f.breedPh} />
          </Field>
        </div>
        <Field label={f.vaccine} error={errors.vaccine} optional={t.common.optional}>
          <Input type="date" value={vaccineExpiry} onChange={(e) => (setVaccine(e.target.value), setErrors((x) => without(x, "vaccine")))} />
        </Field>
        <Field label={f.notes} error={errors.notes} optional={t.common.optional}>
          <Textarea value={notes} onChange={(e) => (setNotes(e.target.value), setErrors((x) => without(x, "notes")))} placeholder={f.notesPh} />
        </Field>
      </fieldset>

      <fieldset className="ds-form__section">
        <Heading level={2} size="sm">{f.ownerSection}</Heading>
        <Field label={f.ownerName} error={errors.owner}>
          <Input value={ownerName} onChange={(e) => (setOwnerName(e.target.value), setErrors((x) => without(x, "owner")))} placeholder={f.ownerPh} autoComplete="name" />
        </Field>
        <Field label={f.ownerWa} hint={f.ownerWaHint} error={errors.wa} optional={t.common.optional}>
          <Input value={wa} onChange={(e) => (setWa(e.target.value), setErrors((x) => without(x, "wa")))} placeholder="08xx xxxx xxxx" inputMode="tel" autoComplete="tel" />
        </Field>
      </fieldset>

      <div className="ds-form__actions">
        {extraActions}
        <span className="ds-form__spacer" />
        {onCancel && (
          <Button variant="secondary" onClick={onCancel}>
            {t.common.cancel}
          </Button>
        )}
        <Button type="submit" icon="check">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
