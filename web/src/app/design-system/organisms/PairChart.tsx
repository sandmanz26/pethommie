import { useId, useState } from "react";
import "./organisms.css";

export type Pair = { key: string; tick: string; label: string; a: number; b: number };

/**
 * Two measures side by side per period (income and expenses, by month), on one scale, with a legend. Pointing at or
 * tabbing to a period shows both numbers in the readout above.
 */
export function PairChart({ title, items, aLabel, bLabel, summary }: { title: string; items: Pair[]; aLabel: string; bLabel: string; summary?: string }) {
  const [active, setActive] = useState<number | null>(null);
  const id = useId();
  const top = Math.max(0, ...items.flatMap((i) => [i.a, i.b]));
  const h = (v: number) => `${top > 0 ? Math.round((Math.max(0, v) / top) * 100) : 0}%`;
  return (
    <figure className="ds-chart ds-pair" aria-labelledby={id}>
      <figcaption className="ds-chart__head">
        <b id={id}>{title}</b>
        <span className="ds-chart__readout" aria-hidden="true">{active !== null ? items[active].label : summary}</span>
      </figcaption>
      <div className="ds-pairlegend" aria-hidden="true">
        <span><i className="ds-pairlegend__a" />{aLabel}</span>
        <span><i className="ds-pairlegend__b" />{bLabel}</span>
      </div>
      <div className="ds-chart__plot">
        <div className="ds-chart__bars" role="list" onPointerLeave={() => setActive(null)}>
          {items.map((it, i) => (
            <span
              key={it.key}
              className={`ds-pair__group${active === i ? " is-active" : ""}`}
              role="listitem"
              tabIndex={0}
              title={it.label}
              aria-label={it.label}
              onPointerEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
            >
              <i className="ds-pair__a" style={{ height: h(it.a) }} />
              <i className="ds-pair__b" style={{ height: h(it.b) }} />
            </span>
          ))}
        </div>
      </div>
      <div className="ds-chart__ticks" aria-hidden="true">
        {items.map((it) => (
          <span key={it.key}>{it.tick}</span>
        ))}
      </div>
    </figure>
  );
}
