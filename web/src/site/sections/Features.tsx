import { useSiteT } from "@/site/i18n/useSiteT";
import { BrushLine } from "@/site/components/ui/BrushLine";
import "./sections.css";

export function Features() {
  const { features } = useSiteT().t;
  return (
    <section className="section" id="features">
      <div className="wrap">
        <div className="section-head">
          <span className="eyebrow">{features.eyebrow}</span>
          <h2>{features.title}</h2>
          <p>{features.lead}</p>
        </div>
        <BrushLine />
        <div className="features">
          {features.items.map((f) => (
            <div className="feature" key={f.title}>
              <h3>{f.title}</h3>
              {f.soon && <span className="feature__soon">{features.soon}</span>}
              <p>{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
