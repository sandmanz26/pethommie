import { useMemo, useState } from "react";
import { formatRupiah, formatDate, dayOf, timeOf } from "@/app/domain/logic";
import { paymentReminder, waLink } from "@/app/domain/messages";
import { receivables, recentPayments, type Receivable } from "@/app/domain/payments";
import { useStore } from "@/app/store/AppStore";
import { useAppT } from "@/app/i18n/useAppT";
import { Heading, Muted } from "@/app/design-system/atoms/Text";
import { EmptyState } from "@/app/design-system/molecules/EmptyState";
import { Segmented } from "@/app/design-system/molecules/Segmented";
import { StatCard } from "@/app/design-system/molecules/StatCard";
import { PageHeader } from "@/app/design-system/organisms/PageHeader";
import { ReceivableRow } from "@/app/design-system/organisms/ReceivableRow";
import { Link } from "react-router-dom";
import "./pages.css";

type Filter = "all" | Receivable["group"];

/** What is still owed across all stays, grouped by how urgent it is, with a reminder ready to send. */
export function PaymentsPage() {
  const { data } = useStore();
  const { t, locale } = useAppT();
  const p = t.paymentsPage;
  const [filter, setFilter] = useState<Filter>("all");
  const rows = useMemo(() => receivables(data), [data]);
  const recent = useMemo(() => recentPayments(data, 8), [data]);
  const rp = (n: number) => formatRupiah(n, locale);
  const owed = rows.reduce((sum, r) => sum + r.balance, 0);
  const count = (g: Receivable["group"]) => rows.filter((r) => r.group === g).length;
  const shown = filter === "all" ? rows : rows.filter((r) => r.group === filter);

  const reminder = (r: Receivable) => {
    const pet = data.pets.find((x) => x.id === r.booking.petId);
    const owner = data.owners.find((o) => o.id === pet?.ownerId);
    return waLink(
      owner?.whatsapp ?? "",
      paymentReminder({ hotelName: data.hotel?.name ?? "", ownerName: owner?.name ?? "", petName: pet?.name ?? "", language: owner?.language, checkOut: r.booking.checkOut, balance: r.balance, left: r.group === "left" }),
    );
  };

  return (
    <>
      <PageHeader art="feature-payments" title={p.title} lead={p.lead} />
      <div className="pg-stats pg-stats--wide">
        <StatCard label={p.owedTotal} value={rp(owed)} tone={owed > 0 ? "warn" : "ok"} />
        <StatCard label={p.filters.left} value={count("left")} tone={count("left") ? "danger" : "neutral"} />
        <StatCard label={p.filters.staying} value={count("staying")} tone="info" />
        <StatCard label={p.filters.upcoming} value={count("upcoming")} tone="neutral" />
      </div>

      <Segmented<Filter>
        label={p.title}
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all", label: p.filters.all, count: rows.length },
          { value: "left", label: p.filters.left, count: count("left") },
          { value: "staying", label: p.filters.staying, count: count("staying") },
          { value: "upcoming", label: p.filters.upcoming, count: count("upcoming") },
        ]}
      />

      <div className="pg-list">
        {shown.length ? (
          shown.map((r) => {
            const pet = data.pets.find((x) => x.id === r.booking.petId);
            return <ReceivableRow key={r.booking.id} row={r} pet={pet} owner={data.owners.find((o) => o.id === pet?.ownerId)} reminderHref={reminder(r)} />;
          })
        ) : (
          <EmptyState art="feature-payments">{filter === "all" ? p.empty : p.emptyFilter}</EmptyState>
        )}
      </div>
      <Muted>{p.hint}</Muted>

      <section className="pg-section">
        <div className="pg-panel__head">
          <Heading level={2} size="md">{p.recentTitle}</Heading>
          <Link to="/app/transactions">{p.transactions}</Link>
        </div>
        {recent.length ? (
          <ul className="ds-paylist">
            {recent.map(({ booking, payment }) => {
              const pet = data.pets.find((x) => x.id === booking.petId);
              return (
                <li key={payment.id}>
                  <span>
                    <b>{rp(payment.amount)}</b>
                    <small>
                      <Link className="ds-booking__name" to={`/app/bookings/${booking.id}`}>{pet?.name ?? "—"}</Link> · {t.payments.methods[payment.method]} ·{" "}
                      {formatDate(dayOf(payment.at), locale, { day: "numeric", month: "short" })} {timeOf(payment.at, locale)}
                    </small>
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <Muted>{p.noRecent}</Muted>
        )}
      </section>
    </>
  );
}
