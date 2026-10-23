import { Link } from "react-router-dom";
import type { HotelData, ISODate } from "@/app/domain/types";
import { addDays, formatDate, nights, stayPetIds, todayISO } from "@/app/domain/logic";
import { poolDays, startOfWeek, type CalendarView } from "@/app/domain/calendar";
import { useAppT } from "@/app/i18n/useAppT";
import "./organisms.css";

/**
 * The calendar of a hotel without cages or rooms. A week: one card per day with how many of its places are taken
 * ("7/15") and the pets staying. A month: a month grid of days with their counts. A day opens (onOpenDay) to show
 * who is there and to book from it.
 */
export function PoolCalendar({ data, view, from, days, onOpenDay }: { data: HotelData; view: CalendarView; from: ISODate; days: number; onOpenDay: (date: ISODate) => void }) {
  const { t, locale } = useAppT();
  const today = todayISO();
  const petName = (id: string) => data.pets.find((p) => p.id === id)?.name ?? "—";
  const list = poolDays(data, from, days);
  const loadOf = (used: number, total: number) => (used >= total ? "full" : used > 0 ? "some" : "none");

  if (view === "month") {
    const lead = Array.from({ length: nights(startOfWeek(from), from) });
    const weekdays = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(from), i));
    return (
      <div className="ds-poolmonth" role="group" aria-label={t.units.none.calendar}>
        {weekdays.map((d) => (
          <span key={d} className="ds-poolmonth__wd" aria-hidden="true">
            {formatDate(d, locale, { weekday: "short" })}
          </span>
        ))}
        {lead.map((_, i) => (
          <span key={`lead${i}`} aria-hidden="true" />
        ))}
        {list.map((d) => {
          const label = t.pool.day(formatDate(d.date, locale, { day: "numeric", month: "short" }), d.used, d.total);
          return (
            <button type="button" key={d.date} className={`ds-poolmonth__day is-${loadOf(d.used, d.total)}${d.date === today ? " is-today" : ""}`} aria-label={label} title={label} onClick={() => onOpenDay(d.date)}>
              <b>{formatDate(d.date, locale, { day: "numeric" })}</b>
              <small>
                {d.used}/{d.total}
              </small>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <ol className="ds-pool" aria-label={t.units.none.calendar}>
      {list.map((d) => {
        const date = formatDate(d.date, locale, { day: "numeric", month: "short" });
        const label = t.pool.day(date, d.used, d.total);
        return (
          <li key={d.date} className={`ds-pool__day is-${loadOf(d.used, d.total)}${d.date === today ? " is-today" : ""}`} aria-label={label}>
            <button type="button" className="ds-pool__head" aria-label={label} onClick={() => onOpenDay(d.date)}>
              <span>
                <small>{formatDate(d.date, locale, { weekday: "short" })}</small> <b>{date}</b>
              </span>
              <b className="ds-pool__count">
                {d.used}/{d.total}
              </b>
            </button>
            {d.stays.length ? (
              <ul className="ds-pool__pets">
                {d.stays.map((b) => (
                  <li key={b.id}>
                    <Link className={`ds-pool__pet ds-pool__pet--${b.status}`} to={`/app/bookings/${b.id}`}>
                      {stayPetIds(b).map(petName).join(" & ")}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <small className="ds-pool__empty">{t.pool.nobody}</small>
            )}
            {d.used < d.total && (
              <Link className="ds-pool__book" to={`/app/bookings/new?in=${d.date}&out=${addDays(d.date, 1)}`} aria-label={t.pool.bookDay(date)}>
                +
              </Link>
            )}
          </li>
        );
      })}
    </ol>
  );
}
