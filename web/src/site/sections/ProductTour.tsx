import { useState } from "react";
import { useSiteT } from "@/site/i18n/useSiteT";
import { Button } from "@/site/components/ui/Button";
import "./sections.css";

/** The screens are captured from the real app (scripts/capture-screens.mjs), per language. */
const SCREEN_SIZE = { width: 1600, height: 1000 };
const PHONE_SIZE = { width: 520, height: 1125 };

/**
 * Three real screens behind a tab bar: the laptop view with the same screen on a phone beside it, side by side so
 * neither hides the other (on a phone, only the phone view, which is the one that reads at that size).
 */
export function ProductTour() {
  const { t, locale } = useSiteT();
  const tour = t.tour;
  const [active, setActive] = useState(0);
  const item = tour.items[active];
  return (
    <section className="section" id="tour">
      <div className="wrap">
        <div className="section-head section-head--center">
          <span className="eyebrow">{tour.eyebrow}</span>
          <h2>{tour.title}</h2>
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
              onClick={() => setActive(i)}
              onKeyDown={(e) => {
                const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
                if (!step) return;
                e.preventDefault();
                const next = (i + step + tour.items.length) % tour.items.length;
                setActive(next);
                document.getElementById(`tour-tab-${tour.items[next].key}`)?.focus();
              }}
            >
              {it.title}
            </button>
          ))}
        </div>
        {tour.items.map((it, i) => (
          <div key={it.key} className="tour__stage" role="tabpanel" id={`tour-panel-${it.key}`} aria-labelledby={`tour-tab-${it.key}`} hidden={i !== active}>
            <div className="tour__laptop">
              <span className="tour__dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <img src={`/screens/${it.key}-${locale}.webp`} alt={tour.imageAlt(it.title)} {...SCREEN_SIZE} loading="lazy" decoding="async" />
            </div>
            <div className="tour__phone">
              <img src={`/screens/${it.key}-phone-${locale}.webp`} alt={tour.phoneAlt(it.title)} {...PHONE_SIZE} loading="lazy" decoding="async" />
            </div>
          </div>
        ))}
        <p className="tour__caption" aria-live="polite">
          {item.body}
        </p>
        <div className="tour__cta">
          <Button href="/app/login" variant="seal">
            {tour.cta}
          </Button>
          <span>{tour.ctaNote}</span>
        </div>
      </div>
    </section>
  );
}
