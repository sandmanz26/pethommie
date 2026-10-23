import { Link } from "react-router-dom";
import type { HotelData, ISODate } from "@/app/domain/types";
import { addDays, formatDate, stayPetIds, todayISO } from "@/app/domain/logic";
import { poolDays } from "@/app/domain/calendar";
import { useAppT } from "@/app/i18n/useAppT";
import "./organisms.css";

/**
 * The calendar of a hotel without cages or rooms: one card per day with how many of its places are taken
 * ("7/15") and the pets staying. A day with room left books from that day.
 */
export function PoolCalendar({ data, from, days }: { data: HotelData; from: ISODate; days: number }) {
  const { t, locale } = useAppT();
  const today = todayISO();
  const petName = (id: string) => data.pets.find((p) => p.id === id)?.name ?? "—";

  return (
    <ol className="ds-pool" aria-label={t.units.none.calendar}>
      {poolDays(data, from, days).map((d) => {
        const date = formatDate(d.date, locale, { day: "numeric", month: "short" });
        const label = t.pool.day(date, d.used, d.total);
        const load = d.used >= d.total ? "full" : d.used > 0 ? "some" : "none";
        return (
          <li key={d.date} className={`ds-pool__day is-${load}${d.date === today ? " is-today" : ""}`} aria-label={label}>
            <div className="ds-pool__head">
              <span>
                <small>{formatDate(d.date, locale, { weekday: "short" })}</small> <b>{date}</b>
              </span>
              <b className="ds-pool__count">
                {d.used}/{d.total}
              </b>
            </div>
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
