import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { dashboardFor } from "@/app/domain/dashboard";
import { petNames } from "@/app/domain/invoices";
import { dayOf, formatDate, formatRupiah, todayISO, vaccineState } from "@/app/domain/logic";
import { receivables } from "@/app/domain/payments";
import type { PaymentMethod } from "@/app/domain/types";
import { useStore } from "@/app/store/AppStore";
import { useAppT } from "@/app/i18n/useAppT";
import { Badge } from "@/app/design-system/atoms/Badge";
import { Button } from "@/app/design-system/atoms/Button";
import { StatCard } from "@/app/design-system/molecules/StatCard";
import { BarList } from "@/app/design-system/organisms/BarList";
import { ColumnChart } from "@/app/design-system/organisms/ColumnChart";
import { PageHeader } from "@/app/design-system/organisms/PageHeader";
import { percentOf, trendOf } from "./trend";
import "./pages.css";

const METHODS: PaymentMethod[] = ["cash", "qris", "transfer", "ewallet", "card"];

/** A card with a short list and a way to the full page. */
function Panel({ title, to, more, empty, children }: { title: string; to?: string; more?: string; empty: string; children: ReactNode[] }) {
  return (
    <section className="pg-panel" aria-label={title}>
      <div className="pg-panel__head">
        <h2>{title}</h2>
        {to && more && <Link to={to}>{more}</Link>}
      </div>
      {children.length ? <ul>{children}</ul> : <p className="pg-panel__empty">{empty}</p>}
    </section>
  );
}

/** The owner's overview: tonight, this month against last, what's coming, what's owed, what needs checking. */
export function DashboardPage() {
  const { data } = useStore();
  const { t, locale } = useAppT();
  const d = t.dashboardPage;
  const [today] = useState(todayISO);
  const dash = useMemo(() => dashboardFor(data, today), [data, today]);
  const chase = useMemo(() => receivables(data).filter((r) => r.group !== "upcoming").slice(0, 5), [data]);

  const rp = (n: number) => formatRupiah(n, locale);
  const pct = (x: number) => percentOf(x, locale);
  const day = (x: string) => formatDate(x, locale, { day: "numeric", month: "short" });
  const weekday = (x: string) => formatDate(x, locale, { weekday: "short" });
  const month = (m: string) => formatDate(`${m}-01`, locale, { month: "short" });
  const booked = dash.forecast.reduce((n, f) => n + f.occupied, 0);
  const forecastAvg = dash.places ? booked / (dash.places * dash.forecast.length) : 0;
  const pet = (id: string) => data.pets.find((p) => p.id === id);
  const unit = (id: string) => data.cages.find((c) => c.id === id)?.name ?? "—";

  return (
    <>
      <PageHeader
        art="feature-calendar"
        title={d.title}
        lead={d.lead}
        actions={
          <Button to="/app/reports" variant="secondary" icon="chart">
            {d.openReports}
          </Button>
        }
      />

      <div className="pg-stats pg-stats--wide">
        <StatCard label={d.tonight} value={dash.places ? pct(dash.tonight.occupied / dash.places) : "–"} tone="ok" note={d.tonightNote(dash.tonight.occupied, dash.places)} />
        <StatCard label={d.receivedMonth} value={rp(dash.monthToDate.received)} tone="brand" trend={trendOf(dash.monthToDate.received, dash.lastMonthToDate.received, locale, d.vsLastMonth)} />
        <StatCard label={d.staysMonth} value={dash.monthToDate.stays} tone="info" trend={trendOf(dash.monthToDate.stays, dash.lastMonthToDate.stays, locale, d.vsLastMonth)} />
        <StatCard label={d.owed} value={rp(dash.owed.total)} tone={dash.owed.left ? "danger" : dash.owed.total ? "warn" : "ok"} note={dash.owed.stays ? d.owedNote(dash.owed.stays, dash.owed.left) : undefined} />
      </div>

      <section className="pg-panel pg-panel--today" aria-label={d.todayTitle}>
        <div className="pg-panel__head">
          <h2>{d.todayTitle}</h2>
          <Link to="/app">{d.openToday}</Link>
        </div>
        <dl className="pg-today">
          <div><dt>{d.arriving}</dt><dd>{dash.arrivingToday}</dd></div>
          <div><dt>{d.leaving}</dt><dd>{dash.leavingToday}</dd></div>
          <div><dt>{d.inHouse}</dt><dd>{dash.inHouse}</dd></div>
          <div className={dash.lateArrivals ? "is-warn" : ""}><dt>{d.late}</dt><dd>{dash.lateArrivals}</dd></div>
        </dl>
      </section>

      <div className="pg-columns">
        <ColumnChart
          title={d.forecastTitle}
          summary={d.forecastSummary(pct(forecastAvg))}
          scale={t.reportsPage.chartScale(dash.places)}
          max={dash.places}
          columns={dash.forecast.map((f, i) => ({ key: f.date, value: f.occupied, label: d.forecastLabel(`${weekday(f.date)} ${day(f.date)}`, f.occupied, dash.places), tick: i % 2 === 0 ? day(f.date) : "" }))}
        />
        <ColumnChart
          title={d.monthsTitle}
          tone="brand"
          max={0}
          summary={rp(dash.months.reduce((s, m) => s + m.received, 0))}
          columns={dash.months.map((m) => ({ key: m.month, value: m.received, label: d.monthLabel(formatDate(`${m.month}-01`, locale, { month: "long", year: "numeric" }), rp(m.received)), tick: month(m.month) }))}
        />
      </div>

      <div className="pg-columns">
        <Panel title={d.arrivingTitle} to="/app/bookings" more={d.seeAll} empty={d.arrivingNone}>
          {dash.arrivingSoon.slice(0, 6).map((b) => (
            <li key={b.id}>
              <Link to={`/app/bookings/${b.id}`}>{petNames(data, b) || "—"}</Link>
              <span>{weekday(b.checkIn)} {day(b.checkIn)} · {unit(b.cageId)}</span>
            </li>
          ))}
        </Panel>
        <Panel title={d.chaseTitle} to="/app/payments" more={d.seeAll} empty={d.chaseNone}>
          {chase.map((r) => (
            <li key={r.booking.id}>
              <Link to={`/app/bookings/${r.booking.id}`}>{petNames(data, r.booking) || "—"}</Link>
              <span>{t.paymentsPage.filters[r.group]}</span>
              <b>{rp(r.balance)}</b>
            </li>
          ))}
        </Panel>
        <Panel title={d.vaccineTitle} to="/app/pets" more={d.seeAll} empty={d.vaccineNone}>
          {dash.vaccineAlerts.slice(0, 6).map((p) => {
            const state = vaccineState(p, today);
            return (
              <li key={p.id}>
                <Link to={`/app/pets/${p.id}`}>{p.name}</Link>
                <Badge tone={state === "expired" ? "danger" : "warn"}>{t.pets.vaccine[state]}</Badge>
              </li>
            );
          })}
        </Panel>
        <Panel title={d.incidentsTitle} empty={d.incidentsNone}>
          {dash.incidents.slice(0, 5).map((e) => {
            const b = data.bookings.find((x) => x.id === e.bookingId);
            return (
              <li key={e.id}>
                <Link to={`/app/bookings/${e.bookingId}#care`}>{b ? petNames(data, b) : "—"}</Link>
                <span>
                  {day(dayOf(e.at))} · {e.note}
                </span>
              </li>
            );
          })}
        </Panel>
        <Panel title={d.overdueTitle} to="/app/invoices" more={d.seeAll} empty={d.overdueNone}>
          {dash.overdueInvoices.slice(0, 6).map((i) => (
            <li key={i.id}>
              <Link to={`/app/invoices/${i.id}`}>{i.number}</Link>
              <span>{i.customer.name || pet(data.bookings.find((b) => b.id === i.bookingId)?.petId ?? "")?.name || "—"} · {d.dueOn(day(i.dueOn!))}</span>
              <b>{rp(i.total)}</b>
            </li>
          ))}
        </Panel>
      </div>

      <div className="pg-columns">
        <BarList
          title={d.sourcesTitle}
          empty={t.reportsPage.noData}
          rows={dash.month.bySource.map((s) => ({ key: s.source, label: t.bookingForm.sources[s.source], value: s.stays, display: t.reportsPage.staysCount(s.stays), note: rp(s.value) }))}
        />
        <BarList
          title={d.methodsTitle}
          tone="brand"
          empty={t.reportsPage.noMoney}
          rows={METHODS.filter((m) => dash.month.byMethod[m] !== 0).map((m) => ({ key: m, label: t.payments.methods[m], value: dash.month.byMethod[m], display: rp(dash.month.byMethod[m]) }))}
        />
        <section className="pg-panel" aria-label={d.taxTitle}>
          <div className="pg-panel__head">
            <h2>{d.taxTitle}</h2>
            <Link to="/app/tax">{d.seeAll}</Link>
          </div>
          <p className="pg-panel__empty">{dash.taxThisMonth ? d.taxLine(rp(Math.round(dash.taxThisMonth.pph)), rp(dash.taxThisMonth.ppn), day(dash.taxThisMonth.dueOn)) : d.taxSetup}</p>
        </section>
      </div>
    </>
  );
}
