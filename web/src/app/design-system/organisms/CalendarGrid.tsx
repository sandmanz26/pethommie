import { Link } from "react-router-dom";
import type { HotelData, ISODate } from "@/app/domain/types";
import { addDays, formatDate, todayISO } from "@/app/domain/logic";
import { calendarBars, occupiedCount } from "@/app/domain/calendar";
import { useAppT } from "@/app/i18n/useAppT";
import "./organisms.css";

/**
 * Cages down the side, days across the top, a bar for each stay. An empty night is a link that opens a new
 * booking for that cage and day, so the calendar is also the quickest way to book.
 */
export function CalendarGrid({ data, from, days }: { data: HotelData; from: ISODate; days: number }) {
  const { t, locale } = useAppT();
  const c = t.calendar;
  const today = todayISO();
  const dates = Array.from({ length: days }, (_, i) => addDays(from, i));
  const petName = (petId: string) => data.pets.find((p) => p.id === petId)?.name ?? "—";

  return (
    <div className="ds-cal" style={{ "--days": days } as React.CSSProperties} role="region" aria-label={c.title} tabIndex={0}>
      <div className="ds-cal__row ds-cal__head">
        <span className="ds-cal__label" />
        {dates.map((d, i) => (
          <span key={d} className={`ds-cal__day${d === today ? " is-today" : ""}`} style={{ gridColumn: i + 2 }} title={c.occupied(occupiedCount(data, d), data.cages.length)}>
            <small>{formatDate(d, locale, { weekday: "short" })}</small>
            <b>{formatDate(d, locale, { day: "numeric" })}</b>
            <small>{occupiedCount(data, d)}/{data.cages.length}</small>
          </span>
        ))}
      </div>
      {data.cages.map((cage) => {
        const bars = calendarBars(data, cage.id, from, days);
        const taken = new Set(bars.flatMap((b) => Array.from({ length: b.span }, (_, i) => b.start + i)));
        return (
          <div key={cage.id} className="ds-cal__row">
            <span className="ds-cal__label">
              <b>{cage.name}</b>
              <small>{t.common.sizes[cage.size]}</small>
            </span>
            {dates.map((d, i) =>
              taken.has(i) ? null : (
                <Link
                  key={d}
                  className={`ds-cal__free${d === today ? " is-today" : ""}`}
                  style={{ gridColumn: i + 2 }}
                  to={`/app/bookings/new?cage=${cage.id}&in=${d}&out=${addDays(d, 1)}`}
                  aria-label={c.bookHere(cage.name, formatDate(d, locale, { day: "numeric", month: "short" }))}
                />
              ),
            )}
            {bars.map((b) => (
              <Link
                key={b.booking.id}
                className={`ds-cal__bar ds-cal__bar--${b.booking.status}${b.continuesBefore ? " is-cut-before" : ""}${b.continuesAfter ? " is-cut-after" : ""}`}
                style={{ gridColumn: `${b.start + 2} / span ${b.span}` }}
                to={`/app/bookings/${b.booking.id}`}
              >
                {[b.booking.petId, ...b.booking.companionIds].map(petName).join(" & ")}
              </Link>
            ))}
          </div>
        );
      })}
    </div>
  );
}
