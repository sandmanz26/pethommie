import { useSiteT } from "@/site/i18n/useSiteT";
import "./sections.css";

/** Who it is for: four ways of boarding pets, each with its picture and how Pethommie counts it. */
export function Kinds() {
  const { kinds } = useSiteT().t;
  return (
    <section className="section" id="for-you">
      <div className="wrap">
        <div className="section-head section-head--center">
          <span className="eyebrow">{kinds.eyebrow}</span>
          <h2>{kinds.title}</h2>
          <p className="section-lead">{kinds.lead}</p>
        </div>
        <ul className="kinds">
          {kinds.items.map((k) => (
            <li className="kind" key={k.art}>
              <img src={`/illustrations/${k.art}.webp`} alt="" width="280" height="280" loading="lazy" decoding="async" />
              <span className="kind__tag">{k.tag}</span>
              <h3>{k.title}</h3>
              <p>{k.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
