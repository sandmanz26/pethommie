import { Button } from "../atoms/Button";
import "./molecules.css";

/** Number with − / + buttons, for small counts like cages. */
export function Stepper({
  value,
  onChange,
  min = 0,
  max = 200,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  label: string;
}) {
  const set = (n: number) => onChange(Math.min(max, Math.max(min, Number.isFinite(n) ? n : min)));
  return (
    <div className="ds-stepper" role="group" aria-label={label}>
      <Button variant="secondary" icon="minus" aria-label={`${label} −1`} onClick={() => set(value - 1)} disabled={value <= min} />
      <input
        className="ds-stepper__value"
        inputMode="numeric"
        value={value}
        aria-label={label}
        onChange={(e) => set(parseInt(e.target.value.replace(/\D/g, "") || "0", 10))}
      />
      <Button variant="secondary" icon="plus" aria-label={`${label} +1`} onClick={() => set(value + 1)} disabled={value >= max} />
    </div>
  );
}
