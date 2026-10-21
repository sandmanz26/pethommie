import { useSiteT } from "@/site/i18n/useSiteT";
import "./sections.css";

/** Before and after, as two pictures of the same front desk: the mess of a notebook and chats, and the calm. */
export function BeforeAfter() {
  const { beforeAfter: x } = useSiteT().t;
  return (
    <section className="section" id="compare">
      <div className="wrap">
        <div className="section-head section-head--center">
          <span className="eyebrow">{x.eyebrow}</span>
          <h2>{x.title}</h2>
        </div>
        <div className="ba">
          {(["before", "after"] as const).map((side) => (
            <article key={side} className={`ba__side ba__side--${side}`} aria-labelledby={`ba-${side}`}>
              <img src={`/illustrations/${side}.webp`} alt="" width="320" height="320" loading="lazy" decoding="async" />
              <h3 id={`ba-${side}`}>{x[side].label}</h3>
              <ul>
                {x[side].points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
