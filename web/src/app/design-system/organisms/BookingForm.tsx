import { useMemo, useState, type FormEvent } from "react";
import { bookingIssues, scheduleIssues } from "@/app/domain/bookingRules";
import { normaliseWhatsapp } from "@/shared/lib/phone";
import type { Booking, CageSize, HotelData, PaymentMethod, Species } from "@/app/domain/types";
import {
  addDays,
  bookingTotal,
  formatRupiah,
  freeCages,
  newId,
  nights,
  SIZE_ORDER,
  todayISO,
  vaccineState,
} from "@/app/domain/logic";
import { Button } from "@/app/design-system/atoms/Button";
import { Input, Select, Textarea } from "@/app/design-system/atoms/Input";
import { Heading } from "@/app/design-system/atoms/Text";
import { Alert } from "@/app/design-system/molecules/Alert";
import { CompanionPicker } from "@/app/design-system/molecules/CompanionPicker";
import { Field } from "@/app/design-system/molecules/Field";
import { useAppT } from "@/app/i18n/useAppT";
import "./organisms.css";

export type NewPetQuick = { name: string; species: Species; ownerName: string; whatsapp: string };

/**
 * Create a booking in one screen. Only free cages for the chosen dates are offered,
 * so a double booking can't be entered. A new pet can be added inline.
 */
export function BookingForm({
  data,
  initialPetId,
  initialCageId,
  initialCheckIn,
  initialCheckOut,
  simple,
  onSubmit,
  onCancel,
}: {
  data: HotelData;
  initialPetId?: string;
  /** Prefill from the calendar: the empty day that was tapped. */
  initialCageId?: string;
  initialCheckIn?: string;
  initialCheckOut?: string;
  /** Simple mode: no cage-size filter, so the cage list is just the free ones. */
  simple?: boolean;
  onSubmit: (booking: Booking, newPet?: NewPetQuick) => void;
  onCancel: () => void;
}) {
  const { t, locale } = useAppT();
  const f = t.bookingForm;
  const today = todayISO();

  const [petId, setPetId] = useState(initialPetId ?? "");
  const [companions, setCompanions] = useState<string[]>([]);
  const [adding, setAdding] = useState(data.pets.length === 0);
  const [np, setNp] = useState<NewPetQuick>({ name: "", species: "cat", ownerName: "", whatsapp: "" });
  const [checkIn, setCheckIn] = useState(initialCheckIn ?? today);
  const [checkOut, setCheckOut] = useState(initialCheckOut ?? addDays(initialCheckIn ?? today, 2));
  const [size, setSize] = useState<CageSize | "">("");
  const [cageId, setCageId] = useState(initialCageId ?? "");
  const [deposit, setDeposit] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("transfer");
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
  const siblings = !adding && pet ? data.pets.filter((p) => p.ownerId === pet.ownerId && p.id !== pet.id) : [];
  const chosenCompanions = companions.filter((id) => siblings.some((s) => s.id === id));
  const vState = pet ? vaccineState(pet, checkIn) : null;
  const sortedPets = useMemo(() => [...data.pets].sort((a, b) => a.name.localeCompare(b.name)), [data.pets]);

  const depositAmount = parseInt(deposit.replace(/\D/g, "") || "0", 10);

  function submit(e: FormEvent) {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (adding) {
      if (!np.name.trim()) err.npName = t.petForm.errName;
      if (!np.ownerName.trim()) err.npOwner = t.petForm.errOwner;
      if (np.whatsapp.trim() && !normaliseWhatsapp(np.whatsapp)) err.npWa = t.petForm.errWhatsapp;
    } else if (!petId) err.pet = f.errPet;
    const issues = [
      ...scheduleIssues(data, { cageId: selectedCageId, checkIn, checkOut }),
      ...bookingIssues(data, { id: "", petId: adding ? "" : petId, companionIds: adding ? [] : chosenCompanions, cageId: selectedCageId, checkIn, checkOut, status: "booked", payments: [], charges: [], arrival: null, notes: "", createdAt: "" }).filter((i) => i === "pet_busy" || i === "companion"),
    ];
    if (issues.includes("pet_busy")) err.pet = f.errPetBusy;
    if (issues.includes("companion")) err.companions = f.errCompanion;
    if (issues.includes("dates")) err.dates = f.errDates;
    if (issues.includes("cage")) err.cage = f.errCage;
    if (issues.includes("cage_taken")) err.cage = f.errTaken;
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
        companionIds: adding ? [] : chosenCompanions,
        charges: [],
        payments: depositAmount > 0 ? [{ id: newId(), at: new Date().toISOString(), amount: depositAmount, method, note: "" }] : [],
        arrival: null,
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
        {siblings.length > 0 && <CompanionPicker pets={siblings} value={chosenCompanions} onChange={setCompanions} error={errors.companions} />}
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
          {!simple && (
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
          )}
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
          {depositAmount > 0 && (
            <Field label={t.payments.method}>
              <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                {(["transfer", "qris", "cash"] as PaymentMethod[]).map((m) => (
                  <option key={m} value={m}>
                    {t.payments.methods[m]}
                  </option>
                ))}
              </Select>
            </Field>
          )}
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
