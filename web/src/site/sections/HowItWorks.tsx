import { useSiteT } from "@/site/i18n/useSiteT";
import "./sections.css";

export function HowItWorks() {
  const how = useSiteT().t.howItWorks;
  return (
    <section className="section section--tight" id="how">
      <div className="wrap">
        <div className="section-head">
          <span className="eyebrow">{how.eyebrow}</span>
          <h2>{how.title}</h2>
        </div>
        <ol className="steps">
          {how.steps.map((s, i) => (
            <li key={s.title}>
              <span className="steps__n" aria-hidden="true">{i + 1}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
