import type { Tone } from "@/app/design-system/atoms/Badge";
import "./molecules.css";

/** Which way a number moved against the period before, and whether that is good news. */
export type Trend = { text: string; direction: "up" | "down" | "flat"; good: boolean | null };

/** One number with its label. Tone marks values that need attention; a trend says how it moved. */
export function StatCard({ label, value, tone = "neutral", note, trend }: { label: string; value: number | string; tone?: Tone; note?: string; trend?: Trend }) {
  return (
    <div className={`ds-stat ds-stat--${tone}`}>
      <span className="ds-stat__value">{value}</span>
      <span className="ds-stat__label">{label}</span>
      {trend && (
        <span className={`ds-stat__trend ds-stat__trend--${trend.good === null ? "neutral" : trend.good ? "good" : "bad"}`}>
          <span aria-hidden="true">{trend.direction === "up" ? "▲" : trend.direction === "down" ? "▼" : "■"}</span> {trend.text}
        </span>
      )}
      {note && <span className="ds-stat__note">{note}</span>}
    </div>
  );
}
