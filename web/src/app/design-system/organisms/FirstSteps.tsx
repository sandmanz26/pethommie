import { Link } from "react-router-dom";
import { Icon } from "@/app/design-system/atoms/Icon";
import { Heading, Muted } from "@/app/design-system/atoms/Text";
import { useAppT } from "@/app/i18n/useAppT";
import "./organisms.css";

/** A short checklist for a new operator. `done` lines up with the copy's four items; each links to where it's done. */
export function FirstSteps({ done, links }: { done: boolean[]; links: string[] }) {
  const { t } = useAppT();
  const f = t.firstSteps;
  return (
    <section className="ds-panel ds-steps" aria-labelledby="steps-title">
      <div>
        <Heading level={2} size="md">
          <span id="steps-title">{f.title}</span>
        </Heading>
        <Muted>{f.lead}</Muted>
      </div>
      <ol>
        {f.items.map((label, i) => (
          <li key={label} className={done[i] ? "is-done" : ""}>
            <span className="ds-steps__mark" aria-hidden>
              {done[i] ? <Icon name="check" size={16} /> : i + 1}
            </span>
            {done[i] ? (
              <span>
                {label}
                <span className="ds-sr"> ✓</span>
              </span>
            ) : (
              <Link to={links[i]}>{label}</Link>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
