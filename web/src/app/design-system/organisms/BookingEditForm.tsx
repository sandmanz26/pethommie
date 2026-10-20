import { useState, type FormEvent } from "react";
import type { Booking, HotelData } from "@/app/domain/types";
import type { BookingIssue, BookingPatch } from "@/app/domain/bookingRules";
import { addDays, cageIsFree, formatRupiah, SIZE_ORDER } from "@/app/domain/logic";
import { Button } from "@/app/design-system/atoms/Button";
import { Input, Select, Textarea } from "@/app/design-system/atoms/Input";
import { CompanionPicker } from "@/app/design-system/molecules/CompanionPicker";
import { Field } from "@/app/design-system/molecules/Field";
import { useAppT } from "@/app/i18n/useAppT";
import "./organisms.css";

/** Change the dates, cage or notes of a stay that already exists. Only free cages are offered. */
export function BookingEditForm({
  data,
  booking,
  onSave,
  onCancel,
}: {
  data: HotelData;
  booking: Booking;
  /** Returns what is wrong, or nothing when saved. */
  onSave: (patch: BookingPatch) => BookingIssue[];
  onCancel: () => void;
}) {
  const { t, locale } = useAppT();
  const f = t.bookingForm;
  const d = t.bookingDetail;
  const [checkIn, setCheckIn] = useState(booking.checkIn);
  const [checkOut, setCheckOut] = useState(booking.checkOut);
  const [cageId, setCageId] = useState(booking.cageId);
  const [notes, setNotes] = useState(booking.notes);
  const [companions, setCompanions] = useState<string[]>(booking.companionIds);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const inFixed = booking.status === "checked_in";

  const mainPet = data.pets.find((p) => p.id === booking.petId);
  const siblings = mainPet ? data.pets.filter((p) => p.ownerId === mainPet.ownerId && p.id !== mainPet.id) : [];
  const chosenCompanions = companions.filter((id) => siblings.some((s) => s.id === id));

  const validDates = checkOut > checkIn;
  const cages = data.cages
    .filter((c) => c.id === cageId || !validDates || cageIsFree(data, c.id, checkIn, checkOut, booking.id))
    .sort((a, b) => SIZE_ORDER.indexOf(a.size) - SIZE_ORDER.indexOf(b.size) || a.name.localeCompare(b.name));

  function submit(e: FormEvent) {
    e.preventDefault();
    const issues = onSave({ checkIn, checkOut, cageId, companionIds: chosenCompanions, notes: notes.trim() });
    const err: Record<string, string> = {};
    if (issues.includes("dates")) err.dates = f.errDates;
    if (issues.includes("cage")) err.cage = f.errCage;
    if (issues.includes("cage_taken")) err.cage = f.errTaken;
    if (issues.includes("companion") || issues.includes("pet_busy")) err.companions = issues.includes("pet_busy") ? f.errPetBusy : f.errCompanion;
    if (issues.includes("locked")) err.dates = inFixed ? d.errCheckInFixed : d.errLocked;
    setErrors(err);
  }

  return (
    <form className="ds-form ds-form--panel" onSubmit={submit} noValidate aria-label={d.edit}>
      <div className="ds-form__row">
        <Field label={f.checkIn}>
          <Input type="date" value={checkIn} disabled={inFixed} onChange={(e) => setCheckIn(e.target.value)} />
        </Field>
        <Field label={f.checkOut} error={errors.dates}>
          <Input type="date" value={checkOut} min={addDays(checkIn, 1)} onChange={(e) => setCheckOut(e.target.value)} />
        </Field>
      </div>
      <Field label={f.cage} error={errors.cage}>
        <Select value={cageId} onChange={(e) => setCageId(e.target.value)}>
          {cages.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} · {t.common.sizes[c.size]} · {formatRupiah(c.pricePerNight, locale)}
            </option>
          ))}
        </Select>
      </Field>
      {siblings.length > 0 && <CompanionPicker pets={siblings} value={chosenCompanions} onChange={setCompanions} error={errors.companions} />}
      <Field label={f.notes} optional={t.common.optional}>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={f.notesPh} />
      </Field>
      <div className="ds-form__actions">
        <Button type="submit" icon="check">
          {d.saveEdit}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          {t.common.cancel}
        </Button>
      </div>
    </form>
  );
}
