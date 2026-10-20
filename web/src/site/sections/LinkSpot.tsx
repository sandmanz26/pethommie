import { useSiteT } from "@/site/i18n/useSiteT";
import { Button } from "@/site/components/ui/Button";
import "./sections.css";

/** The booking link: what owners do with it, in three steps, beside its picture. */
export function LinkSpot() {
  const { linkSpot } = useSiteT().t;
  return (
    <section className="section section--deep" id="link">
      <div className="wrap linkspot">
        <img className="linkspot__art" src="/illustrations/app-link.webp" alt="" width="420" height="420" loading="lazy" decoding="async" />
        <div className="linkspot__body">
          <span className="eyebrow">{linkSpot.eyebrow}</span>
          <h2>{linkSpot.title}</h2>
          <p className="section-lead">{linkSpot.lead}</p>
          <ol className="linkspot__steps">
            {linkSpot.steps.map((s, i) => (
              <li key={s.title}>
                <span aria-hidden="true">{i + 1}</span>
                <div>
                  <b>{s.title}</b>
                  <small>{s.body}</small>
                </div>
              </li>
            ))}
          </ol>
          <div className="linkspot__foot">
            <Button href={linkSpot.cta.href}>{linkSpot.cta.label}</Button>
            <small>{linkSpot.note}</small>
          </div>
        </div>
      </div>
    </section>
  );
}
