import type { Booking, HotelData, ISODate } from "@/app/domain/types";
import { addDays, formatDate, isShared, placesUsed, stayPetIds, totalPlaces } from "@/app/domain/logic";
import { dayStays, occupiedCount } from "@/app/domain/calendar";
import { useAppT } from "@/app/i18n/useAppT";
import { Badge } from "@/app/design-system/atoms/Badge";
import { Button } from "@/app/design-system/atoms/Button";
import { Drawer } from "@/app/design-system/molecules/Drawer";
import { StatusBadge } from "@/app/design-system/molecules/StatusBadge";
import "./organisms.css";

/**
 * One day of the calendar, for one unit (or the whole hotel when it has no units): who arrives, stays and leaves,
 * how many places are used, and a new booking for that unit and day while there is room.
 */
export function CalendarDayDrawer({ data, cageId, date, onClose }: { data: HotelData; cageId: string | null; date: ISODate; onClose: () => void }) {
  const { t, locale } = useAppT();
  const d = t.calendar.drawer;
  const cage = cageId ? data.cages.find((c) => c.id === cageId) : undefined;
  const shared = !cage || isShared(cage);
  const used = cage ? placesUsed(data, cage.id, date) : occupiedCount(data, date);
  const total = cage ? (shared ? cage.capacity : 1) : totalPlaces(data);
  const free = used < total;
  const stays = dayStays(data, cageId, date);
  const day = formatDate(date, locale, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const petName = (id: string) => data.pets.find((p) => p.id === id)?.name ?? "—";
  const ownerName = (b: Booking) => {
    const pet = data.pets.find((p) => p.id === b.petId);
    return data.owners.find((o) => o.id === pet?.ownerId)?.name ?? "";
  };
  const short = (x: ISODate) => formatDate(x, locale, { day: "numeric", month: "short" });
  const groups = (["arriving", "staying", "leaving"] as const).filter((k) => stays[k].length);

  return (
    <Drawer title={cage ? `${cage.name} · ${day}` : day} closeLabel={d.close} onClose={onClose}>
      <div className="ds-daydrawer__summary">
        {shared ? <span>{d.places(used, total)}</span> : null}
        <Badge tone={free ? "ok" : shared ? "danger" : "info"}>{free ? d.free : shared ? d.full : d.cageTaken}</Badge>
      </div>
      {free && (
        <Button to={`/app/bookings/new?${cage ? `cage=${cage.id}&` : ""}in=${date}&out=${addDays(date, 1)}`} icon="plus" block>
          {d.newBooking}
        </Button>
      )}
      {groups.length ? (
        groups.map((k) => (
          <section key={k} className="ds-daydrawer__group" aria-label={d[k]}>
            <h3>{d[k]}</h3>
            <ul>
              {stays[k].map((b) => {
                const pets = stayPetIds(b).map(petName).join(" & ");
                return (
                  <li key={b.id} className="ds-daydrawer__stay">
                    <div>
                      <b>{pets}</b>
                      <small>
                        {[ownerName(b), `${short(b.checkIn)} → ${short(b.checkOut)}`].filter(Boolean).join(" · ")}
                      </small>
                      <StatusBadge booking={b} />
                    </div>
                    <Button to={`/app/bookings/${b.id}`} variant="secondary" size="sm" aria-label={`${d.openBooking}: ${pets}`}>
                      {d.openBooking}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      ) : (
        <p className="ds-daydrawer__nobody">{d.nobody}</p>
      )}
    </Drawer>
  );
}
