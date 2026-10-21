import { useSiteT } from "@/site/i18n/useSiteT";
import "./sections.css";

/**
 * What it does: per feature, an illustration in the film's style and one line of words. The real app is shown
 * once, up close, in the tour; here the pictures do the talking. On phones the cards scroll sideways.
 */
export function Features() {
  const { t } = useSiteT();
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
                <img className="feature__art" src={`/illustrations/${f.art}.webp`} alt="" width="280" height="280" loading="lazy" decoding="async" />
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
