import { useMemo, useState, type FormEvent } from "react";
import type { Booking, CageSize, HotelData, Species } from "../../domain/types";
import {
  addDays,
  bookingTotal,
  cageIsFree,
  formatRupiah,
  freeCages,
  newId,
  nights,
  normaliseWhatsapp,
  SIZE_ORDER,
  todayISO,
  vaccineState,
} from "../../domain/logic";
import { Button } from "../atoms/Button";
import { Input, Select, Textarea } from "../atoms/Input";
import { Heading } from "../atoms/Text";
import { Alert } from "../molecules/Alert";
import { Field } from "../molecules/Field";
import { useAppT } from "../../i18n/useAppT";
import "./organisms.css";

export type NewPetQuick = { name: string; species: Species; ownerName: string; whatsapp: string };

/**
 * Create a booking in one screen. Only free cages for the chosen dates are offered,
 * so a double booking can't be entered. A new pet can be added inline.
 */
export function BookingForm({
  data,
  initialPetId,
  onSubmit,
  onCancel,
}: {
  data: HotelData;
  initialPetId?: string;
  onSubmit: (booking: Booking, newPet?: NewPetQuick) => void;
  onCancel: () => void;
}) {
  const { t, locale } = useAppT();
  const f = t.bookingForm;
  const today = todayISO();

  const [petId, setPetId] = useState(initialPetId ?? "");
  const [adding, setAdding] = useState(data.pets.length === 0);
  const [np, setNp] = useState<NewPetQuick>({ name: "", species: "cat", ownerName: "", whatsapp: "" });
  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState(addDays(today, 2));
  const [size, setSize] = useState<CageSize | "">("");
  const [cageId, setCageId] = useState("");
  const [deposit, setDeposit] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validDates = checkOut > checkIn;
  const options = useMemo(
    () => (validDates ? freeCages(data, checkIn, checkOut, size || undefined) : []),
    [data, checkIn, checkOut, size, validDates],
  );
  // Drop a chosen cage that is no longer free for the new dates/size.
  const selectedCageId = options.some((c) => c.id === cageId) ? cageId : "";
  const cage = data.cages.find((c) => c.id === selectedCageId);
  const n = validDates ? nights(checkIn, checkOut) : 0;
  const total = bookingTotal({ checkIn, checkOut }, cage);
  const pet = data.pets.find((p) => p.id === petId);
  const vState = pet ? vaccineState(pet, checkIn) : null;
  const sortedPets = useMemo(() => [...data.pets].sort((a, b) => a.name.localeCompare(b.name)), [data.pets]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (adding) {
      if (!np.name.trim()) err.npName = t.petForm.errName;
      if (!np.ownerName.trim()) err.npOwner = t.petForm.errOwner;
      if (np.whatsapp.trim() && !normaliseWhatsapp(np.whatsapp)) err.npWa = t.petForm.errWhatsapp;
    } else if (!petId) err.pet = f.errPet;
    if (!validDates) err.dates = f.errDates;
    if (!selectedCageId) err.cage = f.errCage;
    else if (!cageIsFree(data, selectedCageId, checkIn, checkOut)) err.cage = f.errTaken;
    setErrors(err);
    if (Object.keys(err).length) return;

    onSubmit(
      {
        id: newId(),
        petId: adding ? "" : petId,
        cageId: selectedCageId,
        checkIn,
        checkOut,
        status: "booked",
        deposit: parseInt(deposit.replace(/\D/g, "") || "0", 10),
        notes: notes.trim(),
        createdAt: new Date().toISOString(),
      },
      adding ? { ...np, whatsapp: np.whatsapp.trim() ? normaliseWhatsapp(np.whatsapp) ?? "" : "" } : undefined,
    );
  }

  return (
    <form className="ds-form" onSubmit={submit} noValidate>
      <fieldset className="ds-form__section">
        <div className="ds-form__sectionhead">
          <Heading level={2} size="sm">{adding ? f.newPetTitle : f.pet}</Heading>
          {data.pets.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setAdding((a) => !a)}>
              {adding ? t.common.cancel : f.newPet}
            </Button>
          )}
        </div>
        {adding ? (
          <>
            <div className="ds-form__row">
              <Field label={t.petForm.name} error={errors.npName}>
                <Input value={np.name} onChange={(e) => setNp({ ...np, name: e.target.value })} placeholder={t.petForm.namePh} autoFocus />
              </Field>
              <Field label={t.petForm.species}>
                <Select value={np.species} onChange={(e) => setNp({ ...np, species: e.target.value as Species })}>
                  {(["cat", "dog", "rabbit", "other"] as Species[]).map((s) => (
                    <option key={s} value={s}>
                      {t.common.species[s]}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="ds-form__row">
              <Field label={t.petForm.ownerName} error={errors.npOwner}>
                <Input value={np.ownerName} onChange={(e) => setNp({ ...np, ownerName: e.target.value })} placeholder={t.petForm.ownerPh} />
              </Field>
              <Field label={t.petForm.ownerWa} error={errors.npWa} optional={t.common.optional}>
                <Input value={np.whatsapp} onChange={(e) => setNp({ ...np, whatsapp: e.target.value })} placeholder="08xx xxxx xxxx" inputMode="tel" />
              </Field>
            </div>
          </>
        ) : (
          <Field label={f.pet} error={errors.pet}>
            <Select value={petId} onChange={(e) => setPetId(e.target.value)}>
              <option value="">{f.petPh}</option>
              {sortedPets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {data.owners.find((o) => o.id === p.ownerId)?.name ?? ""}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {vState && vState !== "ok" && <Alert tone={vState === "expired" ? "danger" : "warn"}>{f.vaccineWarn[vState]}</Alert>}
      </fieldset>

      <fieldset className="ds-form__section">
        <div className="ds-form__row">
          <Field label={f.checkIn}>
            <Input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
          </Field>
          <Field label={f.checkOut} error={errors.dates ?? (!validDates ? f.errDates : undefined)}>
            <Input type="date" value={checkOut} min={addDays(checkIn, 1)} onChange={(e) => setCheckOut(e.target.value)} />
          </Field>
        </div>
        <div className="ds-form__row">
          <Field label={f.size}>
            <Select value={size} onChange={(e) => setSize(e.target.value as CageSize | "")}>
              <option value="">{f.anySize}</option>
              {SIZE_ORDER.map((s) => (
                <option key={s} value={s}>
                  {t.common.sizes[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={`${f.cage}${validDates ? ` · ${f.free(options.length)}` : ""}`} error={errors.cage}>
            <Select value={selectedCageId} onChange={(e) => setCageId(e.target.value)} disabled={!options.length}>
              <option value="">{options.length ? f.cagePh : "—"}</option>
              {options.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {t.common.sizes[c.size]} · {formatRupiah(c.pricePerNight, locale)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        {validDates && options.length === 0 && <Alert tone="info">{f.noCage}</Alert>}
      </fieldset>

      <fieldset className="ds-form__section">
        <div className="ds-form__row">
          <Field label={f.deposit} optional={t.common.optional}>
            <Input value={deposit} onChange={(e) => setDeposit(e.target.value)} inputMode="numeric" placeholder="0" />
          </Field>
          <div className="ds-summary" aria-live="polite">
            <span>{f.summary(n)}</span>
            <b>{formatRupiah(total, locale)}</b>
          </div>
        </div>
        <Field label={f.notes} optional={t.common.optional}>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={f.notesPh} />
        </Field>
      </fieldset>

      <div className="ds-form__actions">
        <span className="ds-form__spacer" />
        <Button variant="secondary" onClick={onCancel}>
          {t.common.cancel}
        </Button>
        <Button type="submit" icon="check">
          {f.save}
        </Button>
      </div>
    </form>
  );
}
