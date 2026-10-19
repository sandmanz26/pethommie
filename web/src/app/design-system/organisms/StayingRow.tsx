import { Link } from "react-router-dom";
import type { Booking, CareEntry, Pet } from "@/app/domain/types";
import { nights, stayDay } from "@/app/domain/logic";
import { Avatar } from "@/app/design-system/atoms/Avatar";
import { Badge } from "@/app/design-system/atoms/Badge";
import { Button } from "@/app/design-system/atoms/Button";
import { useAppT } from "@/app/i18n/useAppT";
import "./organisms.css";

/** A pet that is staying now, with what has been logged today and whether the owner has had the report. */
export function StayingRow({ booking, pet, today, entries, reportSent }: { booking: Booking; pet: Pet | undefined; today: string; entries: CareEntry[]; reportSent: boolean }) {
  const { t } = useAppT();
  const s = t.stayingNow;
  const total = Math.max(1, nights(booking.checkIn, booking.checkOut));
  const incident = entries.some((e) => e.kind === "incident");
  return (
    <article className="ds-staying">
      <Avatar name={pet?.name ?? "?"} species={pet?.species ?? "other"} />
      <div className="ds-staying__main">
        <Link className="ds-booking__name" to={`/app/bookings/${booking.id}`}>
          {pet?.name ?? "—"}
        </Link>
        <span className="ds-booking__meta">
          {s.day(Math.min(stayDay(booking.checkIn, today), total), total)} · {entries.length ? s.entries(entries.length) : s.noEntries}
        </span>
        <span className="ds-staying__badges">
          {incident && <Badge tone="danger">{t.care.incident}</Badge>}
          <Badge tone={reportSent ? "ok" : "warn"}>{reportSent ? s.reportSent : s.reportDue}</Badge>
        </span>
      </div>
      <Button to={`/app/bookings/${booking.id}#care`} size="sm" variant="secondary" icon="edit">
        {s.open}
      </Button>
    </article>
  );
}
