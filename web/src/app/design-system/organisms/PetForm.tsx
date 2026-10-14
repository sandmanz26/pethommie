import { useState, type FormEvent } from "react";
import type { Owner, Pet, Species } from "../../domain/types";
import { formatWhatsapp, normaliseWhatsapp } from "../../domain/logic";
import { Button } from "../atoms/Button";
import { Input, Select, Textarea } from "../atoms/Input";
import { Heading } from "../atoms/Text";
import { Field } from "../molecules/Field";
import { useAppT } from "../../i18n/useAppT";
import "./organisms.css";

export type PetDraft = Omit<Pet, "id" | "ownerId">;
export type OwnerDraft = Omit<Owner, "id">;

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
    const err: Record<string, string> = {};
    if (!name.trim()) err.name = f.errName;
    if (!ownerName.trim()) err.owner = f.errOwner;
    const normalised = wa.trim() ? normaliseWhatsapp(wa) : "";
    if (normalised === null) err.wa = f.errWhatsapp;
    setErrors(err);
    if (Object.keys(err).length) return;
    onSubmit(
      { name: name.trim(), species, breed: breed.trim(), vaccineExpiry, notes: notes.trim() },
      { name: ownerName.trim(), whatsapp: normalised ?? "" },
    );
  }

  return (
    <form className="ds-form" onSubmit={submit} noValidate>
      <fieldset className="ds-form__section">
        <Heading level={2} size="sm">{f.petSection}</Heading>
        <Field label={f.name} error={errors.name}>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={f.namePh} autoFocus={!pet} />
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
          <Field label={f.breed} optional={t.common.optional}>
            <Input value={breed} onChange={(e) => setBreed(e.target.value)} placeholder={f.breedPh} />
          </Field>
        </div>
        <Field label={f.vaccine} optional={t.common.optional}>
          <Input type="date" value={vaccineExpiry} onChange={(e) => setVaccine(e.target.value)} />
        </Field>
        <Field label={f.notes} optional={t.common.optional}>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={f.notesPh} />
        </Field>
      </fieldset>

      <fieldset className="ds-form__section">
        <Heading level={2} size="sm">{f.ownerSection}</Heading>
        <Field label={f.ownerName} error={errors.owner}>
          <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder={f.ownerPh} autoComplete="name" />
        </Field>
        <Field label={f.ownerWa} hint={f.ownerWaHint} error={errors.wa} optional={t.common.optional}>
          <Input value={wa} onChange={(e) => setWa(e.target.value)} placeholder="08xx xxxx xxxx" inputMode="tel" autoComplete="tel" />
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
