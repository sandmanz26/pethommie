import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import "./organisms.css";

export type BarRow = { key: string; label: ReactNode; value: number; display: string; note?: string; href?: string };

/** A ranked breakdown: one row per category, its value in words and a bar for its share of the largest. */
export function BarList({ title, rows, empty, tone = "info" }: { title: string; rows: BarRow[]; empty: string; tone?: "ok" | "info" | "brand" }) {
  const top = Math.max(0, ...rows.map((r) => r.value));
  return (
    <section className={`ds-barlist ds-barlist--${tone}`} aria-label={title}>
      <h2>{title}</h2>
      {rows.length ? (
        <ul>
          {rows.map((r) => (
            <li key={r.key}>
              <span className="ds-barlist__label">{r.href ? <Link to={r.href}>{r.label}</Link> : r.label}</span>
              <span className="ds-barlist__value">
                {r.display}
                {r.note && <small>{r.note}</small>}
              </span>
              <span className="ds-barlist__track" aria-hidden="true">
                <i style={{ width: `${top > 0 ? Math.max(r.value > 0 ? 2 : 0, Math.round((Math.max(0, r.value) / top) * 100)) : 0}%` }} />
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="ds-barlist__empty">{empty}</p>
      )}
    </section>
  );
}
