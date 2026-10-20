import { useMemo, useState } from "react";
import type { HotelData, ISODate, Species } from "@/app/domain/types";
import { ownerWithNumber, type GuestDraft, type GuestErrors } from "@/app/domain/guest";
import { vaccineState } from "@/app/domain/logic";
import { formatWhatsapp } from "@/shared/lib/phone";
import { Badge } from "@/app/design-system/atoms/Badge";
import { Button } from "@/app/design-system/atoms/Button";
import { Checkbox } from "@/app/design-system/atoms/Checkbox";
import { Input, Select } from "@/app/design-system/atoms/Input";
import { Heading, Muted } from "@/app/design-system/atoms/Text";
import { Alert } from "@/app/design-system/molecules/Alert";
import { Field } from "@/app/design-system/molecules/Field";
import { useAppT } from "@/app/i18n/useAppT";
import "./organisms.css";

const SPECIES: Species[] = ["cat", "dog", "rabbit", "other"];

/**
 * The first part of a booking: find the owner (by name, WhatsApp or a pet's name) or add a new one, then tick the
 * pets that are staying, or add one. A number that already belongs to someone offers that person instead of a
 * duplicate.
 */
export function GuestPicker({ data, value, onChange, errors, on }: { data: HotelData; value: GuestDraft; onChange: (g: GuestDraft) => void; errors: GuestErrors; on: ISODate }) {
  const { t } = useAppT();
  const g = t.guest;
  const [q, setQ] = useState("");
  const owner = data.owners.find((o) => o.id === value.ownerId);
  const petsOf = (id: string) => data.pets.filter((p) => p.ownerId === id).sort((a, b) => a.name.localeCompare(b.name));
  const set = (patch: Partial<GuestDraft>) => onChange({ ...value, ...patch });

  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const digits = q.replace(/\D/g, "");
    const all = [...data.owners].sort((a, b) => a.name.localeCompare(b.name));
    if (!needle) return all.slice(0, 6);
    return all
      .filter(
        (o) =>
          o.name.toLowerCase().includes(needle) ||
          (digits.length >= 3 && (o.whatsapp.includes(digits) || o.whatsapp.includes(digits.replace(/^0/, "62")))) ||
          data.pets.some((p) => p.ownerId === o.id && p.name.toLowerCase().includes(needle)),
      )
      .slice(0, 8);
  }, [data, q]);

  const pickOwner = (id: string) => onChange({ ownerId: id, newOwner: null, petIds: petsOf(id).length === 1 ? [petsOf(id)[0].id] : [], newPet: petsOf(id).length ? null : { name: "", species: "cat" } });
  // "Add <what was typed>" fills it in; the plain "New owner" button (shown when there are matches) starts blank.
  const startNew = () => {
    if (matches.length) return onChange({ ownerId: null, newOwner: { name: "", whatsapp: "" }, petIds: [], newPet: { name: "", species: "cat" } });
    const digits = q.replace(/[\s-]/g, "");
    const looksLikeNumber = /^\+?\d{6,}$/.test(digits);
    onChange({ ownerId: null, newOwner: { name: looksLikeNumber ? "" : q.trim(), whatsapp: looksLikeNumber ? q.trim() : "" }, petIds: [], newPet: { name: "", species: "cat" } });
  };
  const sameNumber = value.newOwner ? ownerWithNumber(data, value.newOwner.whatsapp) : undefined;

  const newPetFields = value.newPet && (
    <div className="ds-guest__newpet">
      <div className="ds-form__row">
        <Field label={g.petName} error={errors.petName}>
          <Input value={value.newPet.name} onChange={(e) => set({ newPet: { ...value.newPet!, name: e.target.value } })} placeholder={t.petForm.namePh} />
        </Field>
        <Field label={t.petForm.species}>
          <Select value={value.newPet.species} onChange={(e) => set({ newPet: { ...value.newPet!, species: e.target.value as Species } })}>
            {SPECIES.map((s) => (
              <option key={s} value={s}>
                {t.common.species[s]}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      {(value.petIds.length > 0 || (owner && petsOf(owner.id).length > 0)) && (
        <Button variant="ghost" size="sm" icon="x" onClick={() => set({ newPet: null })}>
          {g.dropNewPet}
        </Button>
      )}
    </div>
  );

  return (
    <fieldset className="ds-form__section ds-guest">
      <div className="ds-form__sectionhead">
        <Heading level={2} size="sm">{g.title}</Heading>
        {(owner || value.newOwner) && (
          <Button variant="ghost" size="sm" onClick={() => onChange({ ...value, ownerId: null, newOwner: null, petIds: [], newPet: null })}>
            {g.change}
          </Button>
        )}
      </div>

      {!owner && !value.newOwner && (
        <>
          <Field label={g.find} hint={g.findHint} error={errors.owner}>
            <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={g.findPh} autoComplete="off" />
          </Field>
          {matches.length > 0 && (
            <ul className="ds-guest__results" aria-label={g.results}>
              {matches.map((o) => {
                const pets = petsOf(o.id);
                return (
                  <li key={o.id}>
                    <button type="button" className="ds-guest__result" onClick={() => pickOwner(o.id)}>
                      <span className="ds-guest__avatar" aria-hidden="true">{o.name.charAt(0).toUpperCase()}</span>
                      <span>
                        <b>{o.name}</b>
                        <small>{[o.whatsapp ? formatWhatsapp(o.whatsapp) : g.noNumber, pets.map((p) => p.name).join(", ")].filter(Boolean).join(" · ")}</small>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {q.trim() && matches.length === 0 && <Muted>{g.noMatch(q.trim())}</Muted>}
          <div>
            <Button variant="secondary" icon="plus" onClick={startNew}>
              {q.trim() && matches.length === 0 && !/\d{6,}/.test(q.replace(/\D/g, "")) ? g.addNamed(q.trim()) : g.newOwner}
            </Button>
          </div>
        </>
      )}

      {owner && (
        <>
          <div className="ds-guest__owner">
            <span className="ds-guest__avatar" aria-hidden="true">{owner.name.charAt(0).toUpperCase()}</span>
            <span>
              <b>{owner.name}</b>
              <small>{owner.whatsapp ? formatWhatsapp(owner.whatsapp) : g.noNumber}</small>
            </span>
          </div>
          {petsOf(owner.id).length > 0 && (
            <fieldset className="ds-guest__pets">
              <legend>{g.whichPets}</legend>
              {petsOf(owner.id).map((p) => {
                const v = vaccineState(p, on);
                return (
                  <div key={p.id} className="ds-guest__pet">
                    <Checkbox
                      label={`${p.name} · ${t.common.species[p.species]}`}
                      checked={value.petIds.includes(p.id)}
                      onChange={(e) => set({ petIds: e.target.checked ? [...value.petIds, p.id] : value.petIds.filter((x) => x !== p.id) })}
                    />
                    {v !== "ok" && <Badge tone={v === "expired" ? "danger" : "warn"}>{t.pets.vaccine[v]}</Badge>}
                  </div>
                );
              })}
            </fieldset>
          )}
          {errors.pets && (
            <p className="ds-field__error" role="alert">
              {errors.pets}
            </p>
          )}
          {value.newPet ? (
            newPetFields
          ) : (
            <div>
              <Button variant="ghost" size="sm" icon="plus" onClick={() => set({ newPet: { name: "", species: "cat" } })}>
                {g.addPetFor(owner.name.split(" ")[0])}
              </Button>
            </div>
          )}
        </>
      )}

      {value.newOwner && (
        <>
          <Alert tone="info">{g.newOwnerNote}</Alert>
          <div className="ds-form__row">
            <Field label={t.petForm.ownerName} error={errors.ownerName}>
              <Input value={value.newOwner.name} onChange={(e) => set({ newOwner: { ...value.newOwner!, name: e.target.value } })} placeholder={t.petForm.ownerPh} autoFocus />
            </Field>
            <Field label={t.petForm.ownerWa} hint={t.petForm.ownerWaHint} error={sameNumber ? undefined : errors.whatsapp} optional={t.common.optional}>
              <Input value={value.newOwner.whatsapp} onChange={(e) => set({ newOwner: { ...value.newOwner!, whatsapp: e.target.value } })} placeholder="08xx xxxx xxxx" inputMode="tel" />
            </Field>
          </div>
          {sameNumber && (
            <Alert tone="warn">
              {g.numberTaken(sameNumber.name)}{" "}
              <Button size="sm" onClick={() => pickOwner(sameNumber.id)}>
                {g.useOwner(sameNumber.name.split(" ")[0])}
              </Button>
            </Alert>
          )}
          {newPetFields}
          {errors.pets && (
            <p className="ds-field__error" role="alert">
              {errors.pets}
            </p>
          )}
        </>
      )}
    </fieldset>
  );
}
