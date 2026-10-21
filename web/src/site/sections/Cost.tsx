import { useEffect, useRef, useState } from "react";
import { useSiteT } from "@/site/i18n/useSiteT";
import { Button } from "@/site/components/ui/Button";
import { leaksFor, rupiah, type HotelSize } from "@/site/lib/leaks";
import "./cost.css";

/** Where the sliders start: a small hotel. */
const START: HotelSize = { cages: 12, rate: 75_000, occupancy: 60 };

/** A number that runs to its new value instead of jumping (at once when the visitor prefers less motion). */
function useRunningNumber(target: number, ms = 600) {
  const [shown, setShown] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const still = typeof window.matchMedia !== "function" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (still) {
      from.current = target;
      setShown(target);
      return;
    }
    const start = performance.now();
    const begin = from.current;
    let frame = requestAnimationFrame(function step(now) {
      const t = Math.min(1, (now - start) / ms);
      const value = Math.round(begin + (target - begin) * (1 - (1 - t) ** 3));
      from.current = value;
      setShown(value);
      if (t < 1) frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [target, ms]);
  return shown;
}

/**
 * Right after the film: what running the hotel from a notebook and chats costs. The leaks come in one by one as the
 * visitor scrolls, the total beside them adds up, and a calculator turns the example into their own hotel.
 */
export function Cost() {
  const { cost } = useSiteT().t;
  const [size, setSize] = useState(START);
  const [reached, setReached] = useState(cost.leaks.length);
  const items = useRef<(HTMLLIElement | null)[]>([]);
  const l = leaksFor(size);
  const money = [l.empty, l.unpaid, l.extras];

  // How many leaks have scrolled into the reading line: the total counts only those.
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const line = window.innerHeight * 0.62;
      setReached(items.current.filter((el) => el && el.getBoundingClientRect().top < line).length);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  const counted = money.slice(0, reached).reduce((s, n) => s + n, 0);
  const shown = useRunningNumber(counted);
  const set = (key: keyof HotelSize) => (e: React.ChangeEvent<HTMLInputElement>) => setSize((s) => ({ ...s, [key]: Number(e.target.value) }));

  return (
    <section className="cost" id="cost" aria-labelledby="cost-title" data-dark>
      <div className="cost__wash" aria-hidden="true" data-parallax="0.18" />
      <div className="wrap">
        <div className="section-head section-head--center">
          <span className="eyebrow">{cost.eyebrow}</span>
          <h2 id="cost-title">{cost.title}</h2>
          <p className="section-lead">{cost.lead}</p>
        </div>

        <div className="cost__story">
          <div className="cost__meter">
            <span className="cost__label">{cost.total}</span>
            <b className="cost__amount">{rupiah(shown)}</b>
            <span className="cost__year">{cost.year(rupiah(counted * 12))}</span>
            <span className="cost__bar" aria-hidden="true">
              <i style={{ width: `${l.total ? (counted / l.total) * 100 : 0}%` }} />
            </span>
          </div>
          <ol className="cost__leaks">
            {cost.leaks.map((leak, i) => (
              <li
                key={leak.key}
                ref={(el) => {
                  items.current[i] = el;
                }}
                className={`cost__leak${i < reached ? " is-on" : ""}`}
              >
                <span className="cost__num" aria-hidden="true">
                  0{i + 1}
                </span>
                <h3>{leak.title}</h3>
                <p>{leak.body}</p>
                <p className="cost__loss">
                  <b>{i < money.length ? `− ${rupiah(money[i])}` : cost.hours(l.hours)}</b>
                  <small>{leak.assumption}</small>
                </p>
              </li>
            ))}
          </ol>
        </div>

        <p className="cost__also">{cost.also}</p>

        <form className="cost__calc" aria-labelledby="cost-calc-title" onSubmit={(e) => e.preventDefault()}>
          <div className="cost__calc-head">
            <h3 id="cost-calc-title">{cost.calc.title}</h3>
            <p>{cost.calc.lead}</p>
          </div>
          <label className="cost__slider">
            <span>{cost.calc.cages}</span>
            <output>{size.cages}</output>
            <input type="range" min={2} max={60} step={1} value={size.cages} onChange={set("cages")} aria-label={cost.calc.cages} />
          </label>
          <label className="cost__slider">
            <span>{cost.calc.rate}</span>
            <output>{rupiah(size.rate)}</output>
            <input type="range" min={25_000} max={300_000} step={5_000} value={size.rate} onChange={set("rate")} aria-label={cost.calc.rate} />
          </label>
          <label className="cost__slider">
            <span>{cost.calc.occupancy}</span>
            <output>{size.occupancy}%</output>
            <input type="range" min={10} max={100} step={5} value={size.occupancy} onChange={set("occupancy")} aria-label={cost.calc.occupancy} />
          </label>
          <p className="cost__result">
            <span>{cost.calc.billed(rupiah(l.billed))}</span>
            <b>
              {cost.total}: {rupiah(l.total)}
            </b>
            <small>{cost.year(rupiah(l.year))}</small>
          </p>
          <p className="cost__note">{cost.calc.note}</p>
        </form>

        <div className="cost__bridge">
          <p>{cost.bridge}</p>
          <Button href={cost.cta.href} variant="seal">
            {cost.cta.label}
          </Button>
          <small>{cost.ctaNote}</small>
        </div>
      </div>
    </section>
  );
}
