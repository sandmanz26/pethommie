import { useSiteT } from "@/site/i18n/useSiteT";
import { LineIcon } from "@/site/components/ui/LineIcon";
import "./sections.css";

/** What it does, one line each. */
export function Features() {
  const { features } = useSiteT().t;
  return (
    <section className="section section--deep" id="features">
      <div className="wrap">
        <div className="section-head section-head--center">
          <span className="eyebrow">{features.eyebrow}</span>
          <h2>{features.title}</h2>
        </div>
        <ul className="features">
          {features.items.map((f) => (
            <li className={`feature${f.soon ? " feature--soon" : ""}`} key={f.title}>
              <span className="feature__icon">
                <LineIcon name={f.icon} />
              </span>
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
