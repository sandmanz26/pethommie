import { useSiteT } from "@/site/i18n/useSiteT";
import "./sections.css";

export function Modes() {
  const modes = useSiteT().t.modes;
  return (
    <section className="section" id="modes">
      <div className="wrap">
        <div className="section-head">
          <span className="eyebrow">{modes.eyebrow}</span>
          <h2>{modes.title}</h2>
        </div>
        <div className="modes">
          {(["simple", "advanced"] as const).map((k) => (
            <div className={`modes__card modes__card--${k}`} key={k}>
              <h3>{modes[k].title}</h3>
              <p>{modes[k].lead}</p>
              <ul>
                {modes[k].points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="modes__note">{modes.note}</p>
      </div>
    </section>
  );
}
