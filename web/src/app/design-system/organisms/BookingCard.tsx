import type { Booking, Cage, Owner, Pet } from "../../domain/types";
import { bookingTotal, formatDate, formatRupiah, formatWhatsapp, nights } from "../../domain/logic";
import { Avatar } from "../atoms/Avatar";
import { Badge, type Tone } from "../atoms/Badge";
import { Button } from "../atoms/Button";
import { useAppT } from "../../i18n/useAppT";
import "./organisms.css";

const statusTone: Record<Booking["status"], Tone> = { booked: "info", checked_in: "ok", checked_out: "neutral", cancelled: "danger" };

const shortDate = (iso: string, locale: string) => formatDate(iso, locale, { day: "numeric", month: "short" });

/** One booking as a row: who, where, when, money, and the next action. */
export function BookingCard({
  booking,
  pet,
  owner,
  cage,
  onCheckIn,
  onCheckOut,
  onCancel,
}: {
  booking: Booking;
  pet?: Pet;
  owner?: Owner;
  cage?: Cage;
  onCheckIn?: () => void;
  onCheckOut?: () => void;
  onCancel?: () => void;
}) {
  const { t, locale } = useAppT();
  const total = bookingTotal(booking, cage);
  const balance = Math.max(0, total - booking.deposit);
  const n = nights(booking.checkIn, booking.checkOut);
  return (
    <article className="ds-booking">
      <Avatar name={pet?.name ?? "?"} species={pet?.species ?? "other"} />
      <div className="ds-booking__main">
        <div className="ds-booking__top">
          <b>{pet?.name ?? "—"}</b>
          <Badge tone={statusTone[booking.status]}>{t.bookings.status[booking.status]}</Badge>
        </div>
        <span className="ds-booking__meta">
          {owner?.name}
          {owner?.whatsapp && ` · ${formatWhatsapp(owner.whatsapp)}`}
        </span>
        <span className="ds-booking__meta">
          <b>{cage?.name ?? "—"}</b> · {shortDate(booking.checkIn, locale)} → {shortDate(booking.checkOut, locale)} · {t.common.nights(n)}
        </span>
      </div>
      <div className="ds-booking__money">
        <span>{formatRupiah(total, locale)}</span>
        {balance > 0 && booking.status !== "cancelled" && (
          <small>
            {t.bookings.balance} {formatRupiah(balance, locale)}
          </small>
        )}
      </div>
      {(onCheckIn || onCheckOut || onCancel) && (
        <div className="ds-booking__actions">
          {onCancel && <Button variant="ghost" size="sm" icon="x" aria-label={t.bookings.cancelBooking} onClick={onCancel} />}
          {onCheckIn && (
            <Button size="sm" icon="login" onClick={onCheckIn}>
              {t.bookings.checkIn}
            </Button>
          )}
          {onCheckOut && (
            <Button size="sm" variant="secondary" icon="logout" onClick={onCheckOut}>
              {t.bookings.checkOut}
            </Button>
          )}
        </div>
      )}
    </article>
  );
}
