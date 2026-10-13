import { useLocale } from "../i18n/LocaleProvider";
import { BrushLine } from "../components/ui/BrushLine";
import "./sections.css";

export function Features() {
  const { features } = useLocale().t;
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
              <p>{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
