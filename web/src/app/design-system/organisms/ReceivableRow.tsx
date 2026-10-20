import { Link } from "react-router-dom";
import type { Receivable } from "@/app/domain/payments";
import type { Owner, Pet } from "@/app/domain/types";
import { formatDate, formatRupiah } from "@/app/domain/logic";
import { Avatar } from "@/app/design-system/atoms/Avatar";
import { useAppT } from "@/app/i18n/useAppT";
import "./organisms.css";

/** A stay with money still owed: who, how much of how much, and a reminder to send. */
export function ReceivableRow({ row, pet, owner, reminderHref }: { row: Receivable; pet?: Pet; owner?: Owner; reminderHref: string }) {
  const { t, locale } = useAppT();
  const p = t.paymentsPage;
  const rp = (n: number) => formatRupiah(n, locale);
  return (
    <article className="ds-booking ds-receivable">
      <Avatar name={pet?.name ?? "?"} species={pet?.species ?? "other"} />
      <div className="ds-booking__main">
        <Link className="ds-booking__name" to={`/app/bookings/${row.booking.id}`}>
          {pet?.name ?? "—"}
        </Link>
        <span className="ds-booking__meta">
          {owner?.name} · {formatDate(row.booking.checkIn, locale, { day: "numeric", month: "short" })} → {formatDate(row.booking.checkOut, locale, { day: "numeric", month: "short" })}
        </span>
        <span className="ds-booking__meta">{p.paidOf(rp(row.paid), rp(row.total))}</span>
      </div>
      <div className="ds-booking__money">
        <span className="ds-receivable__due">{rp(row.balance)}</span>
        <small>{p.balance}</small>
      </div>
      <div className="ds-booking__actions">
        <a className="ds-btn ds-btn--secondary ds-btn--sm" href={reminderHref} target="_blank" rel="noopener noreferrer">
          <span>{p.remind}</span>
        </a>
      </div>
    </article>
  );
}
