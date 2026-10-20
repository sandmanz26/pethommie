import { useState } from "react";
import { useSiteT } from "@/site/i18n/useSiteT";
import { Button } from "@/site/components/ui/Button";
import "./sections.css";

/** The screens are captured from the real app (scripts/capture-screens.mjs), one set per language. */
const SCREEN_SIZE = { width: 1280, height: 800 };

/** Three real screens behind tabs: one large picture at a time, with a line on what it is. */
export function ProductTour() {
  const { t, locale } = useSiteT();
  const tour = t.tour;
  const [active, setActive] = useState(0);
  return (
    <section className="section" id="tour">
      <div className="wrap tour">
        <div className="tour__side">
          <div className="section-head">
            <span className="eyebrow">{tour.eyebrow}</span>
            <h2>{tour.title}</h2>
          </div>
          <div className="tour__tabs" role="tablist" aria-label={tour.tabsLabel}>
            {tour.items.map((item, i) => (
              <button
                key={item.key}
                type="button"
                role="tab"
                id={`tour-tab-${item.key}`}
                aria-controls={`tour-panel-${item.key}`}
                aria-selected={i === active}
                tabIndex={i === active ? 0 : -1}
                className="tour__tab"
                onClick={() => setActive(i)}
                onKeyDown={(e) => {
                  const step = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
                  if (!step) return;
                  e.preventDefault();
                  const next = (i + step + tour.items.length) % tour.items.length;
                  setActive(next);
                  document.getElementById(`tour-tab-${tour.items[next].key}`)?.focus();
                }}
              >
                <b>{item.title}</b>
                <span>{item.body}</span>
              </button>
            ))}
          </div>
          <div className="tour__cta">
            <Button href="/app/login" variant="seal">
              {tour.cta}
            </Button>
            <span>{tour.ctaNote}</span>
          </div>
        </div>
        <div className="tour__frame">
          <span className="tour__dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          {tour.items.map((item, i) => (
            <div key={item.key} role="tabpanel" id={`tour-panel-${item.key}`} aria-labelledby={`tour-tab-${item.key}`} hidden={i !== active}>
              <img
                src={`/screens/${item.key}-${locale}.jpg`}
                alt={tour.imageAlt(item.title)}
                width={SCREEN_SIZE.width}
                height={SCREEN_SIZE.height}
                loading="lazy"
                decoding="async"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
