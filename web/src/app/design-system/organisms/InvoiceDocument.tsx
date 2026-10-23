import type { Invoice, Language } from "@/app/domain/types";
import { formatDate, formatRupiah } from "@/app/domain/logic";
import { formatWhatsapp } from "@/shared/lib/phone";
import { messagesFor } from "@/app/i18n/useAppT";
import "./organisms.css";

/**
 * An invoice as it is printed or saved as a PDF: the seller, the customer, the stay, the lines and the totals.
 * It is written in `language` (the invoice's own, unless the viewer is looking at it in the other one), whatever
 * language the app is in. Everything on it comes from the invoice itself, never from the hotel's current settings.
 */
export function InvoiceDocument({ invoice, language, paid }: { invoice: Invoice; language: Language; paid: number | null }) {
  const d = messagesFor(language).invoiceDoc;
  const rp = (n: number) => formatRupiah(n, language);
  const day = (iso: string) => formatDate(iso, language, { day: "numeric", month: "long", year: "numeric" });
  const s = invoice.seller;
  const balance = paid === null ? null : Math.max(0, invoice.total - paid);

  return (
    <article className={`ds-invdoc${invoice.status === "void" ? " is-void" : ""}`} aria-label={`${d.title} ${invoice.number}`} lang={language}>
      {invoice.status === "void" && <div className="ds-invdoc__stamp" aria-hidden="true">{d.void}</div>}
      <header className="ds-invdoc__head">
        <div>
          <h2>{s.legalName || s.name}</h2>
          {s.legalName && s.legalName !== s.name && <p>{s.name}</p>}
          {s.address && <p className="ds-invdoc__pre">{s.address}</p>}
          {s.npwp && (
            <p>
              {d.npwp}: {s.npwp}
            </p>
          )}
        </div>
        <dl className="ds-invdoc__meta">
          <dt>{d.title}</dt>
          <dd className="ds-invdoc__no">{invoice.number}</dd>
          <dt>{d.date}</dt>
          <dd>{day(invoice.issuedOn)}</dd>
          {invoice.dueOn && (
            <>
              <dt>{d.due}</dt>
              <dd>{day(invoice.dueOn)}</dd>
            </>
          )}
        </dl>
      </header>

      <section className="ds-invdoc__parties">
        <div>
          <h3>{d.billTo}</h3>
          <p>
            <b>{invoice.customer.name || "—"}</b>
          </p>
          {invoice.customer.whatsapp && <p>{formatWhatsapp(invoice.customer.whatsapp)}</p>}
        </div>
        <div>
          <h3>{d.stay}</h3>
          <p>
            <b>{invoice.petNames}</b>
          </p>
          <p>
            {day(invoice.stay.checkIn)} → {day(invoice.stay.checkOut)} · {d.nights(invoice.stay.nights)}
          </p>
          {invoice.stay.cageName && (
            <p>
              {d.cage} {invoice.stay.cageName}
            </p>
          )}
        </div>
      </section>

      <div className="ds-invdoc__tablewrap" role="region" tabIndex={0} aria-label={d.description}>
        <table className="ds-invdoc__table">
          <thead>
            <tr>
              <th scope="col">{d.description}</th>
              <th scope="col" className="num">{d.quantity}</th>
              <th scope="col" className="num">{d.unitPrice}</th>
              <th scope="col" className="num">{d.amount}</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((l, i) => (
              <tr key={`${l.label}-${i}`}>
                <td>{l.label}</td>
                <td className="num">{l.quantity}</td>
                <td className="num">{rp(l.unitPrice)}</td>
                <td className="num">{rp(l.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="ds-invdoc__totals">
        {invoice.taxPercent > 0 && (
          <>
            <dt>{d.subtotal}</dt>
            <dd>{rp(invoice.subtotal)}</dd>
            <dt>{d.tax(invoice.taxPercent)}</dt>
            <dd>{rp(invoice.taxAmount)}</dd>
          </>
        )}
        <dt className="grand">{d.total}</dt>
        <dd className="grand">{rp(invoice.total)}</dd>
        {paid !== null && invoice.status === "issued" && (
          <>
            <dt>{d.paid}</dt>
            <dd>{rp(paid)}</dd>
            <dt>{d.balance}</dt>
            <dd>
              <b>{rp(balance ?? 0)}</b>
            </dd>
          </>
        )}
      </dl>
      {invoice.taxPercent > 0 && invoice.pricesIncludeTax && <p className="ds-invdoc__note">{d.pricesIncludeTax}</p>}

      {s.paymentInstructions && (
        <section className="ds-invdoc__pay">
          <h3>{d.paymentInfo}</h3>
          <p className="ds-invdoc__pre">{s.paymentInstructions}</p>
        </section>
      )}
      <p className="ds-invdoc__thanks">{d.thanks}</p>
    </article>
  );
}
