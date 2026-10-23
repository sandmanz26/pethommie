import type { Booking, Cage, Owner, Pet } from "@/app/domain/types";
import { bookingTotal, formatDate, formatRupiah, nights } from "@/app/domain/logic";
import { balanceDue } from "@/app/domain/payments";
import { Link } from "react-router-dom";
import { formatWhatsapp } from "@/shared/lib/phone";
import { Avatar } from "@/app/design-system/atoms/Avatar";
import { StatusBadge } from "@/app/design-system/molecules/StatusBadge";
import { Button } from "@/app/design-system/atoms/Button";
import { useAppT } from "@/app/i18n/useAppT";
import "./organisms.css";

const shortDate = (iso: string, locale: string) => formatDate(iso, locale, { day: "numeric", month: "short" });

/** One booking as a row: who, where, when, money, and the next action. */
export function BookingCard({
  booking,
  pet,
  names,
  owner,
  cage,
  unitLabel,
  checkInTo,
  onCheckOut,
  onCancel,
  onNoShow,
}: {
  booking: Booking;
  pet?: Pet;
  /** Every pet in the stay, when more than one share the cage. */
  names?: string;
  owner?: Owner;
  cage?: Cage;
  /** What to call the unit; empty hides it (a hotel without cages or rooms). Defaults to the unit's name. */
  unitLabel?: string;
  /** Where to do the check-in (the booking page, where the arrival record is filled). */
  checkInTo?: string;
  onCheckOut?: () => void;
  onCancel?: () => void;
  /** For a late arrival: the pet never came. */
  onNoShow?: () => void;
}) {
  const { t, locale } = useAppT();
  const total = bookingTotal(booking, cage);
  const balance = balanceDue(booking, cage);
  const n = nights(booking.checkIn, booking.checkOut);
  return (
    <article className="ds-booking">
      <Avatar name={pet?.name ?? "?"} species={pet?.species ?? "other"} />
      <div className="ds-booking__main">
        <div className="ds-booking__top">
          <Link className="ds-booking__name" to={`/app/bookings/${booking.id}`}>
            {names || pet?.name || "—"}
          </Link>
          <StatusBadge booking={booking} />
        </div>
        <span className="ds-booking__meta">
          {owner?.name}
          {owner?.whatsapp && ` · ${formatWhatsapp(owner.whatsapp)}`}
        </span>
        <span className="ds-booking__meta">
          {(unitLabel ?? cage?.name ?? "—") && <><b>{unitLabel ?? cage?.name ?? "—"}</b> · </>}{shortDate(booking.checkIn, locale)} → {shortDate(booking.checkOut, locale)} · {t.common.nights(n)}
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
      {(checkInTo || onCheckOut || onCancel || onNoShow) && (
        <div className="ds-booking__actions">
          {onNoShow && (
            <Button variant="ghost" size="sm" onClick={onNoShow}>
              {t.cancelFlow.noShow}
            </Button>
          )}
          {onCancel && <Button variant="ghost" size="sm" icon="x" aria-label={t.bookings.cancelBooking} onClick={onCancel} />}
          {checkInTo && (
            <Button to={checkInTo} size="sm" icon="login">
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
