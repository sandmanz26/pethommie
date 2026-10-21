import { useState } from "react";
import { useSiteT } from "@/site/i18n/useSiteT";
import { Button } from "@/site/components/ui/Button";
import { tourSpots } from "@/site/content/tourSpots";
import "./sections.css";

/** The screens are captured from the sample hotel (scripts/capture-screens.mjs), per language, with the points on them. */
const SCREEN_SIZE = { width: 1600, height: 1000 };
const PHONE_SIZE = { width: 520, height: 1125 };

/**
 * Three real screens behind a tab bar, each with what it does for the owner beside it and the ask to try it.
 * The numbered points in the list are marked on the screen; pointing at either lights up both. A laptop view on wide
 * screens; on a phone, the phone view, which is the one that reads at that size.
 */
export function ProductTour() {
  const { t, locale } = useSiteT();
  const tour = t.tour;
  const [active, setActive] = useState(0);
  const [point, setPoint] = useState<number | null>(null);
  const select = (i: number) => {
    setActive(i);
    setPoint(null);
  };
  return (
    <section className="section" id="tour">
      <div className="wrap">
        <div className="section-head section-head--center">
          <span className="eyebrow">{tour.eyebrow}</span>
          <h2>{tour.title}</h2>
          <p className="tour__lead">{tour.lead}</p>
        </div>
        <div className="tour__tabs" role="tablist" aria-label={tour.tabsLabel}>
          {tour.items.map((it, i) => (
            <button
              key={it.key}
              type="button"
              role="tab"
              id={`tour-tab-${it.key}`}
              aria-controls={`tour-panel-${it.key}`}
              aria-selected={i === active}
              tabIndex={i === active ? 0 : -1}
              className="tour__tab"
              onClick={() => select(i)}
              onKeyDown={(e) => {
                const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
                if (!step) return;
                e.preventDefault();
                const next = (i + step + tour.items.length) % tour.items.length;
                select(next);
                document.getElementById(`tour-tab-${tour.items[next].key}`)?.focus();
              }}
            >
              {it.title}
            </button>
          ))}
        </div>
        {tour.items.map((it, i) => {
          const spots = tourSpots[locale][it.key] ?? [];
          return (
            <div key={it.key} className="tour__stage" role="tabpanel" id={`tour-panel-${it.key}`} aria-labelledby={`tour-tab-${it.key}`} hidden={i !== active}>
              <div className="tour__screen">
                <div className="tour__laptop">
                  <span className="tour__dots" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                  <div className="tour__shot">
                    <img src={`/screens/${it.key}-${locale}.webp`} alt={tour.imageAlt(it.title)} {...SCREEN_SIZE} loading="lazy" decoding="async" />
                    {spots.map(
                      (s, n) =>
                        s && (
                          <span
                            key={n}
                            className={`tour__spot${point === n ? " is-on" : ""}`}
                            style={{ left: `${s.x}%`, top: `${s.y}%` }}
                            aria-hidden="true"
                            onPointerEnter={() => setPoint(n)}
                            onPointerLeave={() => setPoint(null)}
                          >
                            {n + 1}
                          </span>
                        ),
                    )}
                  </div>
                </div>
                <div className="tour__phone">
                  <img src={`/screens/${it.key}-phone-${locale}.webp`} alt={tour.phoneAlt(it.title)} {...PHONE_SIZE} loading="lazy" decoding="async" />
                </div>
              </div>
              <div className="tour__pitch">
                <h3>{it.heading}</h3>
                <ol className="tour__points" aria-label={tour.pointsLabel}>
                  {it.points.map((p, n) => (
                    <li key={p} className={point === n ? "is-on" : undefined} onPointerEnter={() => setPoint(n)} onPointerLeave={() => setPoint(null)}>
                      <span className="tour__num" aria-hidden="true">
                        {n + 1}
                      </span>
                      {p}
                    </li>
                  ))}
                </ol>
                <div className="tour__cta">
                  <Button href={tour.cta.href} variant="seal">
                    {tour.cta.label}
                  </Button>
                  <small>{tour.ctaNote}</small>
                  <a className="tour__trial" href={tour.prices.href}>
                    {tour.prices.label} →
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
