import { useMemo, useState, type FormEvent } from "react";
import { bookingIssues, scheduleIssues } from "@/app/domain/bookingRules";
import type { Booking, BookingSource, CageSize, HotelData, PaymentMethod } from "@/app/domain/types";
import { emptyGuest, guestErrors, type GuestDraft, type GuestErrors } from "@/app/domain/guest";
import {
  addDays,
  bookingTotal,
  cageIsFree,
  formatRupiah,
  isShared,
  newId,
  nights,
  placesUsed,
  SIZE_ORDER,
  todayISO,
  vaccineState,
} from "@/app/domain/logic";
import { Button } from "@/app/design-system/atoms/Button";
import { Input, Select, Textarea } from "@/app/design-system/atoms/Input";
import { Alert } from "@/app/design-system/molecules/Alert";
import { Field } from "@/app/design-system/molecules/Field";
import { GuestPicker } from "./GuestPicker";
import { useAppT } from "@/app/i18n/useAppT";
import { dateError, moneyError, textError } from "@/app/forms/messages";
import { useFocusInvalid } from "@/shared/hooks/useFocusInvalid";
import { LIMITS, parseRupiah } from "@/shared/lib/validate";
import "./organisms.css";

/**
 * Create a booking in one screen: who it is for (an owner on record, or a new one, and the pets staying), the
 * dates, and a unit. Only free units for the chosen dates are offered, so a double booking can't be entered.
 */
export function BookingForm({
  data,
  initialPetId,
  initialCageId,
  initialCheckIn,
  initialCheckOut,
  initialGuest,
  initialSource,
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
  /** Prefill from a request made on the booking link. */
  initialGuest?: GuestDraft;
  initialSource?: BookingSource;
  /** Simple mode: no cage-size filter, so the cage list is just the free ones. */
  simple?: boolean;
  /** The booking, and who it is for: the page saves a new owner or pet first. `booking.petId` is empty when the only pet is new. */
  onSubmit: (booking: Booking, guest: GuestDraft) => void;
  onCancel: () => void;
}) {
  const { t, locale } = useAppT();
  const f = t.bookingForm;
  const today = todayISO();
  const v = t.validation;
  const { ref, focusInvalid } = useFocusInvalid();

  const [guest, setGuest] = useState<GuestDraft>(() => {
    if (initialGuest) return initialGuest;
    const pet = data.pets.find((p) => p.id === initialPetId);
    if (pet) return { ownerId: pet.ownerId, newOwner: null, petIds: [pet.id], newPet: null };
    return data.owners.length ? emptyGuest() : { ownerId: null, newOwner: { name: "", whatsapp: "" }, petIds: [], newPet: { name: "", species: "cat" } };
  });
  const [checkIn, setCheckIn] = useState(initialCheckIn ?? today);
  const [checkOut, setCheckOut] = useState(initialCheckOut ?? addDays(initialCheckIn ?? today, 2));
  const [size, setSize] = useState<CageSize | "">("");
  const [cageId, setCageId] = useState(initialCageId ?? "");
  const [deposit, setDeposit] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("transfer");
  const [source, setSource] = useState<BookingSource>(initialSource ?? "whatsapp");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [guestErr, setGuestErr] = useState<GuestErrors>({});
  const clear = (...keys: string[]) => setErrors((x) => Object.fromEntries(Object.entries(x).filter(([k]) => !keys.includes(k))));

  const validDates = checkOut > checkIn;
  // The owner's pets that are staying: the first is the one the stay is booked for, the rest share the unit.
  const chosen = guest.ownerId ? guest.petIds.filter((id) => data.pets.some((p) => p.id === id && p.ownerId === guest.ownerId)) : [];
  const petId = chosen[0] ?? "";
  const chosenCompanions = chosen.slice(1);
  // A cage holds the whole party; a shared room needs a place for each pet.
  const party = Math.max(1, chosen.length + (guest.newPet ? 1 : 0));
  const options = useMemo(
    () => (validDates ? data.cages.filter((c) => (!size || c.size === size) && cageIsFree(data, c.id, checkIn, checkOut, undefined, isShared(c) ? party : 1)) : []),
    [data, checkIn, checkOut, size, validDates, party],
  );
  // Drop a chosen cage that is no longer free for the new dates/size.
  const selectedCageId = options.some((c) => c.id === cageId) ? cageId : "";
  const cage = data.cages.find((c) => c.id === selectedCageId);
  const n = validDates ? nights(checkIn, checkOut) : 0;
  // Priced for the whole party: in a shared room each pet pays, including one not saved yet.
  const total = bookingTotal({ checkIn, checkOut, companionIds: Array.from({ length: party - 1 }, (_, i) => String(i)) }, cage);
  const states = chosen.map((id) => data.pets.find((p) => p.id === id)).flatMap((p) => (p ? [vaccineState(p, checkIn)] : []));
  const vState = states.includes("expired") ? "expired" : states.includes("soon") ? "soon" : states.includes("unknown") ? "unknown" : null;

  const depositAmount = parseRupiah(deposit) || 0;

  function submit(e: FormEvent) {
    e.preventDefault();
    const err: Record<string, string> = {};
    const g = t.guest;
    const gErr = guestErrors(data, guest, { owner: g.errOwner, ownerName: g.errOwnerName, whatsapp: t.petForm.errWhatsapp, taken: g.errTaken, pets: g.errPets, petName: g.errPetName });
    const issues = [
      ...scheduleIssues(data, { cageId: selectedCageId, checkIn, checkOut, places: isShared(cage) ? party : 1 }),
      ...(petId ? bookingIssues(data, { id: "", petId, companionIds: chosenCompanions, cageId: selectedCageId, checkIn, checkOut, rate: cage?.pricePerNight ?? 0, status: "booked", cancelReason: null, source, payments: [], charges: [], arrival: null, notes: "", createdAt: "" }).filter((i) => i === "pet_busy" || i === "companion") : []),
    ];
    if (issues.includes("pet_busy")) gErr.pets = f.errPetBusy;
    if (issues.includes("companion")) err.companions = f.errCompanion;
    if (issues.includes("dates")) err.dates = f.errDates;
    if (issues.includes("cage")) err.cage = f.errCage;
    if (issues.includes("cage_taken")) err.cage = f.errTaken;
    // Lengths of what is typed for a new owner or pet, once the basics are there.
    if (guest.newOwner && !gErr.ownerName) {
      const m = textError(v, guest.newOwner.name, LIMITS.personName);
      if (m) gErr.ownerName = m;
    }
    if (guest.newPet && !gErr.petName) {
      const m = textError(v, guest.newPet.name, LIMITS.petName);
      if (m) gErr.petName = m;
    }
    const inErr = dateError(v, checkIn);
    const outErr = dateError(v, checkOut);
    if (inErr) err.checkIn = inErr;
    if (outErr) err.dates = outErr;
    const depositErr = moneyError(v, locale, deposit) ?? (cage && depositAmount > total ? v.depositTooHigh(formatRupiah(total, locale)) : undefined);
    if (depositErr) err.deposit = depositErr;
    const notesErr = textError(v, notes, { max: LIMITS.notes });
    if (notesErr) err.notes = notesErr;
    setErrors(err);
    setGuestErr(gErr);
    if (Object.keys(err).length || Object.keys(gErr).length) return void focusInvalid();

    onSubmit(
      {
        id: newId(),
        petId,
        cageId: selectedCageId,
        checkIn,
        checkOut,
        rate: cage?.pricePerNight ?? 0,
        status: "booked",
        cancelReason: null,
        source,
        companionIds: chosenCompanions,
        charges: [],
        payments: depositAmount > 0 ? [{ id: newId(), at: new Date().toISOString(), amount: depositAmount, method, kind: "deposit", reference: "", note: "" }] : [],
        arrival: null,
        notes: notes.trim(),
        createdAt: new Date().toISOString(),
      },
      guest,
    );
  }

  return (
    <form ref={ref} className="ds-form" onSubmit={submit} noValidate>
      <GuestPicker data={data} value={guest} onChange={setGuest} errors={guestErr} on={checkIn} />
      {vState && <Alert tone={vState === "expired" ? "danger" : "warn"}>{f.vaccineWarn[vState]}</Alert>}

      <fieldset className="ds-form__section">
        <div className="ds-form__row">
          <Field label={f.checkIn} error={errors.checkIn}>
            <Input type="date" value={checkIn} onChange={(e) => (setCheckIn(e.target.value), clear("checkIn", "dates"))} />
          </Field>
          <Field label={f.checkOut} error={errors.dates ?? (!validDates ? f.errDates : undefined)}>
            <Input type="date" value={checkOut} min={addDays(checkIn, 1)} onChange={(e) => (setCheckOut(e.target.value), clear("dates"))} />
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
          <Field label={`${t.units[data.settings.unitTerm].one}${validDates ? ` · ${f.free(options.length)}` : ""}`} error={errors.cage}>
            <Select value={selectedCageId} onChange={(e) => setCageId(e.target.value)} disabled={!options.length}>
              <option value="">{options.length ? f.cagePh : "—"}</option>
              {options.map((c) => (
                <option key={c.id} value={c.id}>
                  {isShared(c)
                    ? `${c.name} · ${t.cages.places(placesUsed(data, c.id, checkIn), c.capacity)} · ${formatRupiah(c.pricePerNight, locale)}`
                    : `${c.name} · ${t.common.sizes[c.size]} · ${formatRupiah(c.pricePerNight, locale)}`}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        {validDates && options.length === 0 && <Alert tone="info">{f.noCage}</Alert>}
      </fieldset>

      <fieldset className="ds-form__section">
        <div className="ds-form__row">
          <Field label={f.deposit} error={errors.deposit} optional={t.common.optional}>
            <Input value={deposit} onChange={(e) => (setDeposit(e.target.value), clear("deposit"))} inputMode="numeric" placeholder="0" />
          </Field>
          {depositAmount > 0 && (
            <Field label={t.payments.method}>
              <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                {(["transfer", "qris", "cash", "ewallet", "card"] as PaymentMethod[]).map((m) => (
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
        <Field label={f.source}>
          <Select value={source} onChange={(e) => setSource(e.target.value as BookingSource)}>
            {(Object.keys(f.sources) as BookingSource[]).map((s) => (
              <option key={s} value={s}>
                {f.sources[s]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={f.notes} error={errors.notes} optional={t.common.optional}>
          <Textarea value={notes} onChange={(e) => (setNotes(e.target.value), clear("notes"))} placeholder={f.notesPh} />
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
