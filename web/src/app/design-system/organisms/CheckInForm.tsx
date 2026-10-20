import { useState, type FormEvent } from "react";
import type { Arrival } from "@/app/domain/types";
import { Button } from "@/app/design-system/atoms/Button";
import { Checkbox } from "@/app/design-system/atoms/Checkbox";
import { Input, Textarea } from "@/app/design-system/atoms/Input";
import { Heading, Muted } from "@/app/design-system/atoms/Text";
import { Field } from "@/app/design-system/molecules/Field";
import { useAppT } from "@/app/i18n/useAppT";
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
export function CheckInForm({ onSubmit, compact }: { onSubmit: (arrival: Arrival | null) => void; /** Only the two checks and the weight: the simple mode. */ compact?: boolean }) {
  const { t } = useAppT();
  const a = t.arrival;
  const [healthy, setHealthy] = useState(true);
  const [fleaFree, setFleaFree] = useState(true);
  const [weight, setWeight] = useState("");
  const [belongings, setBelongings] = useState("");
  const [food, setFood] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | undefined>();

  function submit(e: FormEvent) {
    e.preventDefault();
    const weightKg = parseWeight(weight);
    if (Number.isNaN(weightKg)) return setError(a.errWeight);
    onSubmit({
      at: new Date().toISOString(),
      healthy,
      fleaFree,
      weightKg,
      belongings: belongings.trim(),
      food: food.trim(),
      notes: notes.trim(),
    });
  }

  return (
    <form className="ds-form ds-form--panel" onSubmit={submit} noValidate aria-labelledby="checkin-title">
      <div>
        <span className="ds-panel__title">
          <Heading level={2} size="md">
            <span id="checkin-title">{a.title}</span>
          </Heading>
        </span>
        <Muted>{a.lead}</Muted>
      </div>
      <div className="ds-form__checks">
        <Checkbox label={a.healthy} checked={healthy} onChange={(e) => setHealthy(e.target.checked)} />
        <Checkbox label={a.fleaFree} checked={fleaFree} onChange={(e) => setFleaFree(e.target.checked)} />
      </div>
      <div className="ds-form__row">
        <Field label={a.weight} error={error} optional={t.common.optional}>
          <Input value={weight} onChange={(e) => (setWeight(e.target.value), setError(undefined))} inputMode="decimal" placeholder="4.2" />
        </Field>
        {!compact && (
          <Field label={a.belongings} optional={t.common.optional}>
            <Input value={belongings} onChange={(e) => setBelongings(e.target.value)} placeholder={a.belongingsPh} />
          </Field>
        )}
      </div>
      {!compact && (
        <>
          <Field label={a.food} optional={t.common.optional}>
            <Input value={food} onChange={(e) => setFood(e.target.value)} placeholder={a.foodPh} />
          </Field>
          <Field label={a.notes} optional={t.common.optional}>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={a.notesPh} />
          </Field>
        </>
      )}
      <div className="ds-form__actions">
        <Button type="submit" icon="login">
          {a.save}
        </Button>
        {!compact && (
          <Button variant="ghost" onClick={() => onSubmit(null)}>
            {a.skip}
          </Button>
        )}
      </div>
    </form>
  );
}
