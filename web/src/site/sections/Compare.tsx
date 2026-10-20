import { useSiteT } from "@/site/i18n/useSiteT";
import "./sections.css";

/** Before and after: the questions of a pet hotel day, answered from a notebook and chats, and from Pethommie. */
export function Compare() {
  const { compare } = useSiteT().t;
  return (
    <section className="section" id="compare">
      <div className="wrap">
        <div className="section-head section-head--center">
          <span className="eyebrow">{compare.eyebrow}</span>
          <h2>{compare.title}</h2>
        </div>
        <div className="compare" role="table" aria-label={compare.title}>
          <div className="compare__row compare__row--head" role="row">
            <span role="columnheader" className="compare__q">
              <span className="compare__hidden">{compare.question}</span>
            </span>
            <span role="columnheader" className="compare__before">{compare.before}</span>
            <span role="columnheader" className="compare__after">{compare.after}</span>
          </div>
          {compare.rows.map((r) => (
            <div className="compare__row" role="row" key={r.q}>
              <span role="rowheader" className="compare__q">{r.q}</span>
              <span role="cell" className="compare__before" data-label={compare.before}>
                {r.before}
              </span>
              <span role="cell" className="compare__after" data-label={compare.after}>
                {r.after}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
