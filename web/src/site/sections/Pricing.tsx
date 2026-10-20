import { useSiteT } from "@/site/i18n/useSiteT";
import { Button } from "@/site/components/ui/Button";
import "./sections.css";

/** Two plans: the free trial that exists, and the Lebaran package that is coming, said plainly. */
export function Pricing() {
  const { pricing } = useSiteT().t;
  return (
    <section className="section" id="pricing">
      <div className="wrap">
        <div className="section-head section-head--center">
          <span className="eyebrow">{pricing.eyebrow}</span>
          <h2>{pricing.title}</h2>
        </div>
        <div className="plans">
          {pricing.plans.map((plan) => (
            <article key={plan.name} className={`plan${plan.soon ? " plan--soon" : " plan--main"}`}>
              <h3>
                {plan.name}
                {plan.soon && <span className="feature__soon">{pricing.soon}</span>}
              </h3>
              <p className="plan__price">
                {plan.price} <small>{plan.unit}</small>
              </p>
              <ul className="ticks">
                {plan.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <Button href={plan.cta.href} variant={plan.soon ? "ghost" : "seal"}>
                {plan.cta.label}
              </Button>
            </article>
          ))}
        </div>
        <p className="plans__note">{pricing.note}</p>
      </div>
    </section>
  );
}
