import type { MomentKind } from "@/site/i18n/en";
import { useSiteT } from "@/site/i18n/useSiteT";

/**
 * A small, drawn copy of the app screen that goes with a caption: what the operator sees in Pethommie at that
 * moment of the stay. Sample data from the copy file, so it reads in the visitor's language.
 */
export function Moment({ kind }: { kind: MomentKind }) {
  const { t } = useSiteT();
  const m = t.film.moments;
  return (
    <div className={`moment moment--${kind}`}>
      <span className="moment__app">{t.film.inApp}</span>
      {kind === "profile" && (
        <div className="moment__pet">
          <span className="moment__avatar">{m.profile.title.charAt(0)}</span>
          <span>
            <b>{m.profile.title}</b>
            <small>{m.profile.meta}</small>
          </span>
          <span className="moment__chips">
            {m.profile.chips.map((c) => (
              <i key={c}>{c}</i>
            ))}
          </span>
        </div>
      )}
      {kind === "booking" && (
        <>
          <b className="moment__title">{m.booking.title}</b>
          <div className="moment__cal">
            {m.booking.rows.map(([cage, pet], i) => (
              <div key={cage} className="moment__calrow">
                <span>{cage}</span>
                <span className="moment__days">
                  <i className={`moment__bar moment__bar--${i}`}>{pet}</i>
                </span>
              </div>
            ))}
            <div className="moment__calrow">
              <span>{m.booking.freeCage}</span>
              <span className="moment__days">
                <i className="moment__bar moment__bar--free">{m.booking.free}</i>
              </span>
            </div>
          </div>
          <small className="moment__note">{m.booking.note}</small>
        </>
      )}
      {kind === "checkin" && (
        <>
          <b className="moment__title">{m.checkin.title}</b>
          <ul className="moment__checks">
            {m.checkin.items.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </>
      )}
      {kind === "care" && (
        <>
          <b className="moment__title">{m.care.title}</b>
          <ul className="moment__log">
            {m.care.items.map(([time, emoji, text]) => (
              <li key={time}>
                <time>{time}</time>
                <span aria-hidden="true">{emoji}</span> {text}
              </li>
            ))}
          </ul>
        </>
      )}
      {kind === "extra" && (
        <>
          <b className="moment__title">{m.extra.title}</b>
          <dl className="moment__sum">
            {m.extra.lines.map(([label, amount]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{amount}</dd>
              </div>
            ))}
            <div className="moment__total">
              <dt>{m.extra.total[0]}</dt>
              <dd>{m.extra.total[1]}</dd>
            </div>
          </dl>
        </>
      )}
      {kind === "night" && (
        <>
          <b className="moment__title">{m.night.title}</b>
          <div className="moment__stats">
            {m.night.stats.map(([value, label]) => (
              <span key={label}>
                <b>{value}</b>
                <small>{label}</small>
              </span>
            ))}
          </div>
          <small className="moment__note">{m.night.note}</small>
        </>
      )}
      {kind === "report" && (
        <div className="moment__bubble">
          <b>{m.report.title}</b>
          <ul>
            {m.report.lines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
          <small>{m.report.time}</small>
        </div>
      )}
      {kind === "pickup" && (
        <>
          <span className="moment__invoice">
            <b className="moment__title">{m.pickup.title}</b>
            <i className="moment__paid">{m.pickup.status}</i>
          </span>
          <dl className="moment__sum">
            {m.pickup.lines.map(([label, amount]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{amount}</dd>
              </div>
            ))}
          </dl>
          <small className="moment__note">{m.pickup.note}</small>
        </>
      )}
    </div>
  );
}
