import { useSiteT } from "@/site/i18n/useSiteT";
import "./sections.css";

/** Sizes of the captured screens (scripts/capture-features.mjs), so the page doesn't jump while they load. */
const SHOT_SIZE: Record<string, [number, number]> = {
  calendar: [640, 536],
  checkin: [640, 536],
  care: [640, 350],
  report: [640, 644],
  invoice: [640, 590],
  tax: [640, 447],
};

/**
 * What it does: per feature, an illustration in the film's style and the real screen from the app (or, for what
 * has no screen, a line of what you'd see). One line of words each. On phones the cards scroll sideways.
 */
export function Features() {
  const { t, locale } = useSiteT();
  const features = t.features;
  return (
    <section className="section section--deep" id="features">
      <div className="wrap">
        <div className="section-head section-head--center">
          <span className="eyebrow">{features.eyebrow}</span>
          <h2>{features.title}</h2>
        </div>
        <ul className="features" tabIndex={0} aria-label={features.title}>
          {features.items.map((f) => (
            <li className={`feature${f.soon ? " feature--soon" : ""}`} key={f.title}>
              <div className="feature__visual">
                <img className="feature__art" src={`/illustrations/${f.art}.webp`} alt="" loading="lazy" decoding="async" />
                {f.shot ? (
                  <span className="feature__shot">
                    <img
                      src={`/screens/feature-${f.shot}-${locale}.webp`}
                      alt={features.shotAlt(f.title)}
                      width={SHOT_SIZE[f.shot][0]}
                      height={SHOT_SIZE[f.shot][1]}
                      loading="lazy"
                      decoding="async"
                    />
                  </span>
                ) : (
                  <span className="feature__chip">{f.chip}</span>
                )}
              </div>
              <h3>
                {f.title}
                {f.soon && <span className="feature__soon">{features.soon}</span>}
              </h3>
              <p>{f.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
