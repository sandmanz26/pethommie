import { useSiteT } from "@/site/i18n/useSiteT";
import "./sections.css";

/** The questions people ask first, with a puzzled dog and cat in the bottom corners. */
export function Faq() {
  const faq = useSiteT().t.faq;
  return (
    <section className="section faq-sec" id="faq">
      {/* Fixed-size corners, so opening a question never stretches them. */}
      <img className="faq__corner faq__corner--dog" src="/backgrounds/faq-dog.webp" width={560} height={541} alt="" loading="lazy" decoding="async" />
      <img className="faq__corner faq__corner--cat" src="/backgrounds/faq-cat.webp" width={432} height={581} alt="" loading="lazy" decoding="async" />
      <div className="wrap faq">
        <div className="section-head section-head--center">
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
