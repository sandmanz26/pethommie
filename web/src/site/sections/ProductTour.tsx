import { useSiteT } from "@/site/i18n/useSiteT";
import { Button } from "@/site/components/ui/Button";
import { BrushLine } from "@/site/components/ui/BrushLine";
import "./sections.css";

/** The screens are captured from the real app (scripts/capture-screens.mjs), one set per language. */
const SCREEN_SIZE = { width: 1280, height: 800 };

export function ProductTour() {
  const { t, locale } = useSiteT();
  const tour = t.tour;
  return (
    <section className="section" id="tour">
      <div className="wrap">
        <div className="section-head">
          <span className="eyebrow">{tour.eyebrow}</span>
          <h2>{tour.title}</h2>
          <p>{tour.lead}</p>
        </div>
        <BrushLine />
        <div className="tour">
          {tour.items.map((item) => (
            <figure className="tour__item" key={item.key}>
              <div className="tour__frame">
                <img
                  src={`/screens/${item.key}-${locale}.jpg`}
                  alt={tour.imageAlt(item.title)}
                  width={SCREEN_SIZE.width}
                  height={SCREEN_SIZE.height}
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <figcaption>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </figcaption>
            </figure>
          ))}
        </div>
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
