import { useSiteT } from "@/site/i18n/useSiteT";
import "./sections.css";

/** The dashboard and reports: the real screen, and three things it does that a notebook can't. */
export function Insights() {
  const { t, locale } = useSiteT();
  const x = t.insights;
  return (
    <section className="section section--deep" id="insights">
      <div className="wrap">
        <div className="section-head section-head--center">
          <span className="eyebrow">{x.eyebrow}</span>
          <h2>{x.title}</h2>
          <p className="section-lead">{x.lead}</p>
        </div>
        <figure className="insights__shot">
          <img src={`/screens/wide-dashboard-${locale}.webp`} alt={x.shotAlt} width="1200" height="760" loading="lazy" decoding="async" />
        </figure>
        <ul className="insights__points">
          {x.points.map((p) => (
            <li key={p.title}>
              <b>{p.title}</b>
              <span>{p.body}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
