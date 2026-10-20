import { useSiteT } from "@/site/i18n/useSiteT";
import "./sections.css";

export function Faq() {
  const faq = useSiteT().t.faq;
  return (
    <section className="section section--deep" id="faq">
      <div className="wrap faq">
        <div className="section-head">
          <span className="eyebrow">{faq.eyebrow}</span>
          <h2>{faq.title}</h2>
        </div>
        <div className="faq__list">
          {faq.items.map((item) => (
            <details key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
