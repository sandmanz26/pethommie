import type { CSSProperties } from "react";
import type { MomentKind } from "@/site/i18n/en";
import { useSiteT } from "@/site/i18n/useSiteT";

/** Where the bookings sit on the sample calendar: the first day column and how many nights (columns are 20–26 Oct). */
const CAL = {
  stay: { from: 0, nights: 4 }, // S-01, Mochi, 20 → 24
  staying: { from: 0, nights: 2, cutBefore: true }, // S-02, Kopi, already here, leaves on the 22nd
  clash: { from: 2, nights: 3 }, // S-01 again, 22 → 25: refused
};
/** Cages on the sample night: twelve, three of them taken. */
const CAGES = 12;
const TAKEN = 3;

const span = (from: number, nights: number): CSSProperties => ({ gridColumn: `${from + 1} / span ${nights}` });

/**
 * A small, drawn copy of the app screen that goes with a caption: what the operator sees in Pethommie at that
 * moment of the stay. Built from the app's own vocabulary (stat cards, badges, calendar bars), with sample data from
 * the copy file so it reads in the visitor's language.
 */
export function Moment({ kind }: { kind: MomentKind }) {
  const { t } = useSiteT();
  const m = t.film.moments;
  return (
    <div className={`moment moment--${kind}`}>
      <span className="moment__screen">
        <i aria-hidden="true" />
        {m[kind].screen}
      </span>

      {kind === "profile" && (
        <>
          <div className="moment__who">
            <span className="moment__avatar">{m.profile.name.charAt(0)}</span>
            <span>
              <b>{m.profile.name}</b>
              <small>{m.profile.breed}</small>
            </span>
            <i className="moment__badge moment__badge--info">{m.profile.badge}</i>
          </div>
          <dl className="moment__facts">
            {m.profile.facts.map(([label, value], i) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd className={i === 2 ? "is-ok" : undefined}>{value}</dd>
              </div>
            ))}
          </dl>
        </>
      )}

      {kind === "booking" && (
        <>
          <div className="moment__cal">
            <span />
            <span className="moment__week">
              {m.booking.days.map(([weekday, date]) => (
                <span key={date}>
                  <small>{weekday}</small>
                  {date}
                </span>
              ))}
            </span>
            {m.booking.rows.map(([cage, pet], row) => (
              <div key={cage} className="moment__calrow">
                <span className="moment__cage">{cage}</span>
                <span className="moment__days">
                  {row === 0 && (
                    <>
                      <i className="moment__bar moment__bar--booked" style={span(CAL.stay.from, CAL.stay.nights)}>
                        {pet}
                      </i>
                      <i className="moment__bar moment__bar--clash" style={span(CAL.clash.from, CAL.clash.nights)}>
                        <span aria-hidden="true">✕</span> {m.booking.clash}
                      </i>
                    </>
                  )}
                  {row === 1 && (
                    <i className="moment__bar moment__bar--staying is-cut" style={span(CAL.staying.from, CAL.staying.nights)}>
                      {pet}
                    </i>
                  )}
                </span>
              </div>
            ))}
            <div className="moment__calrow">
              <span className="moment__cage">{m.booking.freeCage}</span>
              <span className="moment__days" />
            </div>
          </div>
          <p className="moment__alert moment__alert--danger">{m.booking.note}</p>
        </>
      )}

      {kind === "checkin" && (
        <>
          <dl className="moment__facts moment__facts--rows">
            {m.checkin.checks.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>
                  <i className="moment__badge moment__badge--ok">{value}</i>
                </dd>
              </div>
            ))}
            {m.checkin.facts.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <p className="moment__alert moment__alert--warn">{m.checkin.warn}</p>
        </>
      )}

      {kind === "care" && (
        <>
          <span className="moment__taps">
            {m.care.taps.map(([emoji, label], i) => (
              <i key={label} className={i === 0 ? "is-on" : undefined}>
                <span aria-hidden="true">{emoji}</span> {label}
              </i>
            ))}
          </span>
          <ul className="moment__log">
            {m.care.items.map(([time, emoji, label, detail]) => (
              <li key={time}>
                <time>{time}</time>
                <span aria-hidden="true">{emoji}</span>
                <span>
                  <b>{label}</b>: {detail}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {kind === "extra" && (
        <dl className="moment__sum">
          {m.extra.lines.map(([label, detail, amount]) => (
            <div key={label}>
              <dt>
                {label}
                <small>{detail}</small>
              </dt>
              <dd>{amount}</dd>
            </div>
          ))}
          <div className="moment__add">
            <dt>+ {m.extra.add}</dt>
          </div>
          <div className="moment__total">
            <dt>{m.extra.total[0]}</dt>
            <dd>{m.extra.total[1]}</dd>
          </div>
        </dl>
      )}

      {kind === "night" && (
        <>
          <div className="moment__stats">
            {m.night.stats.map(([value, label], i) => (
              <span key={label} className={`moment__stat moment__stat--${["ok", "info", "warn", "danger"][i]}`}>
                <b>{value}</b>
                <small>{label}</small>
              </span>
            ))}
          </div>
          <span className="moment__cages">
            <small>{m.night.cages}</small>
            <span aria-hidden="true">
              {Array.from({ length: CAGES }, (_, i) => (
                <i key={i} className={i < TAKEN ? "is-taken" : undefined} />
              ))}
            </span>
          </span>
        </>
      )}

      {kind === "report" && (
        <div className="moment__chat">
          <span className="moment__contact">
            <span className="moment__avatar moment__avatar--small">{m.report.contact.charAt(0)}</span>
            {m.report.contact}
          </span>
          <div className="moment__bubble moment__bubble--out">
            <img src="/illustrations/app-pets.webp" alt="" width="240" height="140" loading="lazy" decoding="async" />
            <b>{m.report.title}</b>
            <ul>
              {m.report.lines.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
            <small>
              {m.report.time} <span className="moment__ticks">✓✓</span>
            </small>
          </div>
          <div className="moment__bubble moment__bubble--in">{m.report.reply}</div>
        </div>
      )}

      {kind === "pickup" && (
        <>
          <span className="moment__invoice">
            <b>{m.pickup.number}</b>
            <i className="moment__badge moment__badge--ok">{m.pickup.status}</i>
          </span>
          <dl className="moment__sum">
            {m.pickup.lines.map(([label, amount], i) => (
              <div key={label} className={i === m.pickup.lines.length - 1 ? "moment__total" : undefined}>
                <dt>{label}</dt>
                <dd>{amount}</dd>
              </div>
            ))}
          </dl>
          <span className="moment__actions">
            <i className="is-primary">{m.pickup.actions[0]}</i>
            <i>{m.pickup.actions[1]}</i>
          </span>
        </>
      )}
    </div>
  );
}
