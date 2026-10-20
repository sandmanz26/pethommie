import { useSiteT } from "@/site/i18n/useSiteT";
import { BrushLine } from "@/site/components/ui/BrushLine";
import "./sections.css";

export function Trust() {
  const trust = useSiteT().t.trust;
  return (
    <section className="section" id="trust">
      <div className="wrap">
        <div className="section-head">
          <span className="eyebrow">{trust.eyebrow}</span>
          <h2>{trust.title}</h2>
        </div>
        <BrushLine />
        <div className="features">
          {trust.items.map((f) => (
            <div className="feature" key={f.title}>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
