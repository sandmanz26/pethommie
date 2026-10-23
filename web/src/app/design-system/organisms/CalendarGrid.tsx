import { useEffect, useRef } from "react";
import type { HotelData, ISODate } from "@/app/domain/types";
import { addDays, formatDate, isShared, placesUsed, todayISO, totalPlaces } from "@/app/domain/logic";
import { calendarBars, occupiedCount } from "@/app/domain/calendar";
import { useAppT } from "@/app/i18n/useAppT";
import "./organisms.css";

/**
 * Cages down the side, days across the top, a bar for each stay. A shared room shows, for each day, how many of its
 * places are taken. Every day and every stay opens that unit's day (onOpenDay), where the stay can be opened or a
 * new booking started for that unit and day.
 */
export function CalendarGrid({ data, from, days, onOpenDay }: { data: HotelData; from: ISODate; days: number; onOpenDay: (cageId: string, date: ISODate) => void }) {
  const { t, locale } = useAppT();
  const c = t.calendar;
  const today = todayISO();
  const dates = Array.from({ length: days }, (_, i) => addDays(from, i));
  const petName = (petId: string) => data.pets.find((p) => p.id === petId)?.name ?? "—";
  const box = useRef<HTMLDivElement>(null);

  // A month is wider than most screens: start scrolled so today (when shown) sits just after the unit names.
  useEffect(() => {
    const el = box.current;
    const day = el?.querySelector<HTMLElement>(".ds-cal__head .is-today");
    const label = el?.querySelector<HTMLElement>(".ds-cal__head .ds-cal__label");
    if (!el) return;
    el.scrollLeft = day && label && day.offsetLeft + day.offsetWidth > el.clientWidth ? day.offsetLeft - label.offsetWidth - day.offsetWidth : 0;
  }, [from, days]);

  return (
    <div ref={box} className={`ds-cal${days > 7 ? " ds-cal--month" : " ds-cal--week"}`} style={{ "--days": days } as React.CSSProperties} role="region" aria-label={c.title} tabIndex={0}>
      <div className="ds-cal__row ds-cal__head">
        <span className="ds-cal__label" />
        {dates.map((d, i) => (
          <span key={d} className={`ds-cal__day${d === today ? " is-today" : ""}`} style={{ gridColumn: i + 2 }} title={c.occupied(occupiedCount(data, d), totalPlaces(data))}>
            <small>{formatDate(d, locale, { weekday: "short" })}</small>
            <b>{formatDate(d, locale, { day: "numeric" })}</b>
            <small>{occupiedCount(data, d)}/{totalPlaces(data)}</small>
          </span>
        ))}
      </div>
      {data.cages.filter((c) => !c.archived).map((cage) => {
        // A shared room: each day shows how many of its places are taken; a free place books it.
        if (isShared(cage)) {
          return (
            <div key={cage.id} className="ds-cal__row">
              <span className="ds-cal__label">
                <b>{cage.name}</b>
                <small>{t.cages.capacityShort(cage.capacity)}</small>
              </span>
              {dates.map((d, i) => {
                const used = placesUsed(data, cage.id, d);
                const label = c.roomDay(used, cage.capacity, formatDate(d, locale, { day: "numeric", month: "short" }));
                const load = used >= cage.capacity ? "full" : used > 0 ? "some" : "none";
                return (
                  <button type="button" key={d} className={`ds-cal__room is-${load}${d === today ? " is-today" : ""}`} style={{ gridColumn: i + 2 }} aria-label={`${cage.name}, ${label}`} title={label} onClick={() => onOpenDay(cage.id, d)}>
                    {used}/{cage.capacity}
                  </button>
                );
              })}
            </div>
          );
        }
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
                <button
                  type="button"
                  key={d}
                  className={`ds-cal__free${d === today ? " is-today" : ""}`}
                  style={{ gridColumn: i + 2 }}
                  aria-label={c.freeDay(cage.name, formatDate(d, locale, { day: "numeric", month: "short" }))}
                  onClick={() => onOpenDay(cage.id, d)}
                />
              ),
            )}
            {bars.map((b) => (
              <button
                type="button"
                key={b.booking.id}
                className={`ds-cal__bar ds-cal__bar--${b.booking.status}${b.continuesBefore ? " is-cut-before" : ""}${b.continuesAfter ? " is-cut-after" : ""}`}
                style={{ gridColumn: `${b.start + 2} / span ${b.span}` }}
                title={[b.booking.petId, ...b.booking.companionIds].map(petName).join(" & ")}
                onClick={() => onOpenDay(cage.id, addDays(from, b.start))}
              >
                <span>{[b.booking.petId, ...b.booking.companionIds].map(petName).join(" & ")}</span>
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}
