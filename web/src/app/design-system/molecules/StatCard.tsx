import type { Tone } from "../atoms/Badge";
import "./molecules.css";

/** One number with its label. Tone marks values that need attention. */
export function StatCard({ label, value, tone = "neutral" }: { label: string; value: number | string; tone?: Tone }) {
  return (
    <div className={`ds-stat ds-stat--${tone}`}>
      <span className="ds-stat__value">{value}</span>
      <span className="ds-stat__label">{label}</span>
    </div>
  );
}
