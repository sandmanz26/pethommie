import { useSiteT } from "@/site/i18n/useSiteT";
import "./sections.css";

/** The questions people ask first, over a scene of a puzzled dog and cat. */
export function Faq() {
  const faq = useSiteT().t.faq;
  return (
    <section className="section faq-sec" id="faq">
      <img
        className="faq__art"
        src="/backgrounds/faq-scene.webp"
        srcSet="/backgrounds/faq-scene-800.webp 800w, /backgrounds/faq-scene.webp 1600w"
        sizes="100vw"
        width={1600}
        height={900}
        alt=""
        loading="lazy"
        decoding="async"
      />
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
