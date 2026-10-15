import { useSiteT } from "@/site/i18n/useSiteT";
import { Button } from "@/site/components/ui/Button";
import "./sections.css";

export function LebaranPackage() {
  const lebaran = useSiteT().t.peakSeason;
  return (
    <section className="section lebaran" id="peak-season">
      <div className="wrap">
        <div className="section-head">
          <span className="eyebrow">{lebaran.eyebrow}</span>
          <h2>{lebaran.title}</h2>
          <p>{lebaran.lead}</p>
        </div>
        <ol className="season">
          {lebaran.timeline.map((step) => (
            <li key={step.day}>
              <span className="season__day">
                {step.day}
                <small>{step.tag}</small>
              </span>
              <span className="muted">{step.body}</span>
            </li>
          ))}
        </ol>
        <div className="price">
          <div>
            <div className="price__amount">
              {lebaran.price} <small>{lebaran.priceUnit}</small>
            </div>
            <p className="muted price__note">{lebaran.priceNote}</p>
          </div>
          <Button href={lebaran.cta.href} variant="seal">
            {lebaran.cta.label}
          </Button>
        </div>
      </div>
    </section>
  );
}
