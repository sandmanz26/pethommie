import type { Booking } from "@/app/domain/types";
import { Badge, type Tone } from "@/app/design-system/atoms/Badge";
import { useAppT } from "@/app/i18n/useAppT";

const statusTone: Record<Booking["status"], Tone> = { booked: "info", checked_in: "ok", checked_out: "neutral", cancelled: "danger" };

/** Where a stay stands: its status, or, for a booked stay that isn't confirmed yet, what it waits for. */
export function StatusBadge({ booking }: { booking: Pick<Booking, "status" | "hold"> }) {
  const { t } = useAppT();
  if (booking.status === "booked" && booking.hold) return <Badge tone={booking.hold === "deposit" ? "warn" : "brand"}>{t.payPolicy.badge[booking.hold]}</Badge>;
  return <Badge tone={statusTone[booking.status]}>{t.bookings.status[booking.status]}</Badge>;
}
