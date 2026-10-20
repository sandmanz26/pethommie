import type { Tone } from "@/app/design-system/atoms/Badge";
import "./molecules.css";

/** One number with its label. Tone marks values that need attention. */
export function StatCard({ label, value, tone = "neutral", note }: { label: string; value: number | string; tone?: Tone; note?: string }) {
  return (
    <div className={`ds-stat ds-stat--${tone}`}>
      <span className="ds-stat__value">{value}</span>
      <span className="ds-stat__label">{label}</span>
      {note && <span className="ds-stat__note">{note}</span>}
    </div>
  );
}
