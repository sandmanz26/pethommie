import { useSiteT } from "@/site/i18n/useSiteT";
import { Button } from "@/site/components/ui/Button";
import "./sections.css";

/** The opening: shown in the film's deck until the story starts. */
export function Hero() {
  const { hero } = useSiteT().t;
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
      <p className="hero__note">{hero.note}</p>
      <div className="hero__hint">
        <i aria-hidden="true" />
        {hero.scrollHint}
      </div>
    </div>
  );
}
