import { useId, useState } from "react";
import type { Column } from "./ColumnChart";
import "./organisms.css";

/**
 * Columns that can go below zero (profit and loss by month): above the line in green, below in red, the zero line
 * drawn. Each column says its numbers on hover, on focus, and to a screen reader.
 */
export function SignedChart({ title, columns, summary }: { title: string; columns: Column[]; summary?: string }) {
  const [active, setActive] = useState<number | null>(null);
  const id = useId();
  const up = Math.max(0, ...columns.map((c) => c.value));
  const down = Math.max(0, ...columns.map((c) => -c.value));
  const span = up + down || 1;
  const zero = (up / span) * 100; // how far down the plot the zero line sits, in %
  return (
    <figure className="ds-chart ds-signed" aria-labelledby={id}>
      <figcaption className="ds-chart__head">
        <b id={id}>{title}</b>
        <span className="ds-chart__readout" aria-hidden="true">{active !== null ? columns[active].label : summary}</span>
      </figcaption>
      <div className="ds-chart__plot ds-signed__plot">
        <span className="ds-signed__zero" style={{ top: `${zero}%` }} aria-hidden="true" />
        <div className="ds-chart__bars" role="list" onPointerLeave={() => setActive(null)}>
          {columns.map((c, i) => {
            const size = (Math.abs(c.value) / span) * 100;
            return (
              <span
                key={c.key}
                className={`ds-signed__col${active === i ? " is-active" : ""}`}
                role="listitem"
                tabIndex={0}
                title={c.label}
                aria-label={c.label}
                onPointerEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
              >
                <i className={c.value < 0 ? "is-loss" : "is-gain"} style={c.value < 0 ? { top: `${zero}%`, height: `${size}%` } : { top: `${zero - size}%`, height: `${size}%` }} />
              </span>
            );
          })}
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
