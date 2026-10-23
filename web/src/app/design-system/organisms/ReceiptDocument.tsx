import type { Booking, HotelData, Language, Owner, Payment } from "@/app/domain/types";
import { dayOf, formatDate, formatRupiah, timeOf, unitLabel } from "@/app/domain/logic";
import { standingAfter } from "@/app/domain/ledger";
import { amountInWords } from "@/app/domain/words";
import { formatWhatsapp } from "@/shared/lib/phone";
import { messagesFor } from "@/app/i18n/useAppT";
import "./organisms.css";

/**
 * A receipt (kuitansi) for one payment, or a refund note, to print or save as a PDF: who paid, how much in figures
 * and in words, for which stay, and what was left to pay after it. Written in `language`.
 */
export function ReceiptDocument({ data, booking, payment, owner, pets, number, language }: { data: HotelData; booking: Booking; payment: Payment; owner: Owner | undefined; pets: string; number: string; language: Language }) {
  const d = messagesFor(language).receiptDoc;
  const rp = (n: number) => formatRupiah(n, language);
  const day = (iso: string) => formatDate(iso, language, { day: "numeric", month: "long", year: "numeric" });
  const cage = data.cages.find((c) => c.id === booking.cageId);
  const refund = payment.kind === "refund";
  const s = data.settings;
  const hotel = data.hotel;
  const after = standingAfter(booking, cage, payment);

  return (
    <article className="ds-invdoc ds-receipt" aria-label={`${refund ? d.refundTitle : d.title} ${number}`} lang={language}>
      <header className="ds-invdoc__head">
        <div>
          <h2>{s.legalName || hotel?.name}</h2>
          {s.legalName && hotel && s.legalName !== hotel.name && <p>{hotel.name}</p>}
          {s.address && <p className="ds-invdoc__pre">{s.address}</p>}
          {hotel?.whatsapp && <p>WA {formatWhatsapp(hotel.whatsapp)}</p>}
        </div>
        <dl className="ds-invdoc__meta">
          <dt>{refund ? d.refundTitle : d.title}</dt>
          <dd className="ds-invdoc__no">{number}</dd>
          <dt>{d.date}</dt>
          <dd>
            {day(dayOf(payment.at))}, {timeOf(payment.at, language)}
          </dd>
        </dl>
      </header>

      <dl className="ds-receipt__rows">
        <dt>{refund ? d.paidTo : d.receivedFrom}</dt>
        <dd>
          <b>{owner?.name || "—"}</b>
          {owner?.whatsapp && <span> · {formatWhatsapp(owner.whatsapp)}</span>}
        </dd>
        <dt>{d.amount}</dt>
        <dd className="ds-receipt__amount">{rp(payment.amount)}</dd>
        <dt>{d.inWords}</dt>
        <dd className="ds-receipt__words">{amountInWords(payment.amount, language)}</dd>
        <dt>{d.for}</dt>
        <dd>
          {d.kinds[payment.kind]} · {d.stayLine(pets, unitLabel(data, cage), day(booking.checkIn), day(booking.checkOut))}
        </dd>
        <dt>{d.method}</dt>
        <dd>
          {d.methods[payment.method]}
          {payment.reference && (
            <span>
              {" "}
              · {d.reference} {payment.reference}
            </span>
          )}
        </dd>
        {payment.note && (
          <>
            <dt>{d.note}</dt>
            <dd>{payment.note}</dd>
          </>
        )}
      </dl>

      <div className="ds-receipt__foot">
        <dl className="ds-invdoc__totals">
          <dt>{d.stayTotal}</dt>
          <dd>{rp(after.total)}</dd>
          <dt>{d.paidToDate}</dt>
          <dd>{rp(after.paid)}</dd>
          <dt className="grand">{d.balance}</dt>
          <dd className="grand">{after.balance > 0 ? rp(after.balance) : d.settled}</dd>
        </dl>
        <div className="ds-receipt__sign">
          <span>{refund ? d.refundSignature : d.signature}</span>
          <i aria-hidden="true" />
          <span>{hotel?.name}</span>
        </div>
      </div>
      <p className="ds-invdoc__thanks">{d.thanks}</p>
    </article>
  );
}
