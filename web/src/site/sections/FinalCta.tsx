import { useEffect, useRef } from "react";
import { useSiteT } from "@/site/i18n/useSiteT";
import { Button } from "@/site/components/ui/Button";
import { WaitlistForm } from "./WaitlistForm";
import "./sections.css";

/** The last ask: try it, or let us set it up with you. */
export function FinalCta() {
  const { cta } = useSiteT().t;
  const help = useRef<HTMLDetailsElement>(null);

  // Links to #join (the Lebaran package's "tell me") open the form straight away.
  useEffect(() => {
    const open = () => {
      if (window.location.hash === "#join" && help.current) help.current.open = true;
    };
    open();
    window.addEventListener("hashchange", open);
    return () => window.removeEventListener("hashchange", open);
  }, []);

  return (
    <section className="cta" id="join">
      <div className="cta__card">
        <h2>{cta.title}</h2>
        <p>{cta.lead}</p>
        <div className="cta__buttons">
          <Button href={cta.primary.href} variant="seal">
            {cta.primary.label}
          </Button>
          <Button href={cta.secondary.href} variant="ghost">
            {cta.secondary.label}
          </Button>
        </div>
        <ul className="cta__chips">
          {cta.chips.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <details ref={help} className="cta__help">
          <summary>{cta.help}</summary>
          <p>{cta.helpLead}</p>
          <WaitlistForm />
        </details>
      </div>
    </section>
  );
}
