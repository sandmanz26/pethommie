import { useState, type FormEvent } from "react";
import type { Arrival } from "@/app/domain/types";
import { Button } from "@/app/design-system/atoms/Button";
import { Checkbox } from "@/app/design-system/atoms/Checkbox";
import { Input, Textarea } from "@/app/design-system/atoms/Input";
import { Heading, Muted } from "@/app/design-system/atoms/Text";
import { Field } from "@/app/design-system/molecules/Field";
import { useAppT } from "@/app/i18n/useAppT";
import { compact as onlyErrors, textError } from "@/app/forms/messages";
import { useFocusInvalid } from "@/shared/hooks/useFocusInvalid";
import { LIMITS } from "@/shared/lib/validate";
import "./organisms.css";

/** Parses "4.2" or "4,2" kg; null for empty, NaN for something that isn't a positive number. */
function parseWeight(text: string): number | null {
  const s = text.trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 && n < 200 ? n : NaN;
}

/**
 * The check-in record: a short checklist of how the pet arrived. It can be skipped (the pet still checks in),
 * but the form makes the careful path the easy one.
 */
export function CheckInForm({
  onSubmit,
  compact,
  vaccineGate = [],
}: {
  onSubmit: (arrival: Arrival | null) => void;
  /** Only the two checks and the weight: the simple mode. */
  compact?: boolean;
  /** Pets whose vaccination is out of date or unknown, when the hotel requires a valid one: check-in waits for the card to be seen. */
  vaccineGate?: string[];
}) {
  const { t } = useAppT();
  const a = t.arrival;
  const [healthy, setHealthy] = useState(true);
  const [fleaFree, setFleaFree] = useState(true);
  const [weight, setWeight] = useState("");
  const [belongings, setBelongings] = useState("");
  const [food, setFood] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Partial<Record<"weight" | "belongings" | "food" | "notes", string>>>({});
  const v = t.validation;
  const { ref, focusInvalid } = useFocusInvalid();
  const [cardSeen, setCardSeen] = useState(false);
  const [gateError, setGateError] = useState(false);
  const gated = vaccineGate.length > 0 && !cardSeen;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (gated) return setGateError(true);
    const weightKg = parseWeight(weight);
    const err = onlyErrors({
      weight: Number.isNaN(weightKg) ? a.errWeight : undefined,
      belongings: textError(v, belongings, { max: LIMITS.line }),
      food: textError(v, food, { max: LIMITS.line }),
      notes: textError(v, notes, { max: LIMITS.notes }),
    });
    setErrors(err);
    if (Object.keys(err).length) return void focusInvalid();
    onSubmit({
      at: new Date().toISOString(),
      healthy,
      fleaFree,
      weightKg,
      belongings: belongings.trim(),
      food: food.trim(),
      // The card seen at the door is part of the record.
      notes: [vaccineGate.length ? a.cardSeenNote : "", notes.trim()].filter(Boolean).join(" "),
    });
  }

  return (
    <form ref={ref} className="ds-form ds-form--panel" onSubmit={submit} noValidate aria-labelledby="checkin-title">
      <div>
        <span className="ds-panel__title">
          <Heading level={2} size="md">
            <span id="checkin-title">{a.title}</span>
          </Heading>
        </span>
        <Muted>{a.lead}</Muted>
      </div>
      {vaccineGate.length > 0 && (
        <div className="ds-vaccinegate" role="group" aria-label={a.vaccineGateTitle}>
          <b>{a.vaccineGate(vaccineGate.join(", "))}</b>
          <Checkbox label={a.cardSeen} checked={cardSeen} onChange={(e) => (setCardSeen(e.target.checked), setGateError(false))} />
          {gateError && (
            <p className="ds-field__error" role="alert">
              {a.errCardSeen}
            </p>
          )}
        </div>
      )}
      <div className="ds-form__checks">
        <Checkbox label={a.healthy} checked={healthy} onChange={(e) => setHealthy(e.target.checked)} />
        <Checkbox label={a.fleaFree} checked={fleaFree} onChange={(e) => setFleaFree(e.target.checked)} />
      </div>
      <div className="ds-form__row">
        <Field label={a.weight} error={errors.weight} optional={t.common.optional}>
          <Input value={weight} onChange={(e) => (setWeight(e.target.value), setErrors((x) => ({ ...x, weight: undefined })))} inputMode="decimal" placeholder="4.2" />
        </Field>
        {!compact && (
          <Field label={a.belongings} error={errors.belongings} optional={t.common.optional}>
            <Input value={belongings} onChange={(e) => (setBelongings(e.target.value), setErrors((x) => ({ ...x, belongings: undefined })))} placeholder={a.belongingsPh} />
          </Field>
        )}
      </div>
      {!compact && (
        <>
          <Field label={a.food} error={errors.food} optional={t.common.optional}>
            <Input value={food} onChange={(e) => (setFood(e.target.value), setErrors((x) => ({ ...x, food: undefined })))} placeholder={a.foodPh} />
          </Field>
          <Field label={a.notes} error={errors.notes} optional={t.common.optional}>
            <Textarea value={notes} onChange={(e) => (setNotes(e.target.value), setErrors((x) => ({ ...x, notes: undefined })))} placeholder={a.notesPh} />
          </Field>
        </>
      )}
      <div className="ds-form__actions">
        <Button type="submit" icon="login">
          {a.save}
        </Button>
        {!compact && (
          <Button variant="ghost" onClick={() => (gated ? setGateError(true) : onSubmit(null))}>
            {a.skip}
          </Button>
        )}
      </div>
    </form>
  );
}
