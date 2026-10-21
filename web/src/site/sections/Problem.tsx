import { useSiteT } from "@/site/i18n/useSiteT";
import { leaksFor, rupiah } from "@/site/lib/leaks";
import "./sections.css";

/** The example hotel the numbers are for: the same one the lead names. */
const EXAMPLE = { cages: 12, rate: 75_000, occupancy: 60 };

/**
 * Right after the film: what running without a system costs, as three numbers with a picture each and the
 * assumption under every one, then the sum. An example, and it says so.
 */
export function Problem() {
  const { problem } = useSiteT().t;
  const l = leaksFor(EXAMPLE);
  const value: Record<string, string> = { empty: rupiah(l.empty), money: rupiah(l.unpaid + l.extras), time: problem.hours(l.hours) };
  return (
    <section className="section problem" id="problem">
      <div className="wrap">
        <div className="section-head section-head--center">
          <span className="eyebrow">{problem.eyebrow}</span>
          <h2>{problem.title}</h2>
          <p>{problem.lead}</p>
        </div>
        <ul className="problem__facts">
          {problem.items.map((item) => (
            <li key={item.key} className="problem__fact">
              <img src={`/illustrations/${item.art}.webp`} alt="" width="280" height="280" loading="lazy" decoding="async" />
              <p className="problem__number">
                <b>{value[item.key]}</b> <span>{problem.perMonth}</span>
              </p>
              <p className="problem__label">{item.label}</p>
              <p className="problem__detail">{item.detail}</p>
            </li>
          ))}
        </ul>
        <p className="problem__total">{problem.total(rupiah(l.total), rupiah(l.year))}</p>
        <p className="problem__note">{problem.note}</p>
      </div>
    </section>
  );
}
