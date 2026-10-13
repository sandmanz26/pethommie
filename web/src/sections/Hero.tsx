import { hero } from "../content/landing";
import { Button } from "../components/ui/Button";
import "./sections.css";

/** Opening inscription, sits over the first frames of the ink film. */
export function Hero() {
  return (
    <div className="hero">
      <h1>
        {hero.titleStart}
        <em>{hero.titleAccent}</em>
        {hero.titleEnd}
      </h1>
      <p>{hero.lead}</p>
      <div className="hero__cta">
        <Button href={hero.primaryCta.href}>{hero.primaryCta.label}</Button>
        <Button href={hero.secondaryCta.href} variant="ghost">
          {hero.secondaryCta.label}
        </Button>
      </div>
      <div className="hero__hint">
        <i aria-hidden="true" />
        {hero.scrollHint}
      </div>
    </div>
  );
}
