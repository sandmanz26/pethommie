import { useId, useState } from "react";
import "./organisms.css";

export type Column = {
  key: string;
  value: number;
  /** Everything about the column in words ("12 Oct: 3 of 5 places"), for the readout and screen readers. */
  label: string;
  /** A short mark under the column; most columns leave it empty. */
  tick?: string;
};

/**
 * Columns of one measure over time (or weekdays). One hue, no second axis. Pointing at or tabbing to a column shows
 * its numbers in the readout above, which otherwise carries the summary.
 */
export function ColumnChart({ title, columns, max, summary, tone = "ok", scale }: { title: string; columns: Column[]; max: number; summary?: string; tone?: "ok" | "info" | "brand"; scale?: string }) {
  const [active, setActive] = useState<number | null>(null);
  const id = useId();
  const top = Math.max(max, ...columns.map((c) => c.value), 0);
  const shown = active !== null ? columns[active] : null;
  return (
    <figure className={`ds-chart ds-chart--${tone}`} aria-labelledby={id}>
      <figcaption className="ds-chart__head">
        <b id={id}>{title}</b>
        <span className="ds-chart__readout" aria-hidden="true">{shown ? shown.label : summary}</span>
      </figcaption>
      <div className="ds-chart__plot">
        {scale && <span className="ds-chart__scale" aria-hidden="true">{scale}</span>}
        <div className="ds-chart__bars" role="list" onPointerLeave={() => setActive(null)}>
          {columns.map((c, i) => (
            <span
              key={c.key}
              className={`ds-chart__bar${active === i ? " is-active" : ""}`}
              role="listitem"
              tabIndex={0}
              title={c.label}
              aria-label={c.label}
              onPointerEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
            >
              <i style={{ height: `${top > 0 ? Math.round((Math.max(0, c.value) / top) * 100) : 0}%` }} />
            </span>
          ))}
        </div>
      </div>
      <div className="ds-chart__ticks" aria-hidden="true">
        {columns.map((c) => (
          <span key={c.key}>{c.tick}</span>
        ))}
      </div>
    </figure>
  );
}
