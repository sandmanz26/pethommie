import { useMemo, useState } from "react";
import { staysCsv } from "@/app/domain/csv";
import { addDays, formatDate, formatRupiah, todayISO } from "@/app/domain/logic";
import { customPeriod, matchesFilter, NO_REPORT_FILTER, PERIOD_KINDS, periodRange, previousPeriod, reportFor, type PeriodKind, type ReportFilter } from "@/app/domain/reports";
import type { PaymentKind, PaymentMethod, Species } from "@/app/domain/types";
import { useStore } from "@/app/store/AppStore";
import { useAppT } from "@/app/i18n/useAppT";
import { Button } from "@/app/design-system/atoms/Button";
import { Input, Select } from "@/app/design-system/atoms/Input";
import { Heading, Muted } from "@/app/design-system/atoms/Text";
import { EmptyState } from "@/app/design-system/molecules/EmptyState";
import { Field } from "@/app/design-system/molecules/Field";
import { Segmented } from "@/app/design-system/molecules/Segmented";
import { StatCard } from "@/app/design-system/molecules/StatCard";
import { BarList } from "@/app/design-system/organisms/BarList";
import { ColumnChart } from "@/app/design-system/organisms/ColumnChart";
import { PageHeader } from "@/app/design-system/organisms/PageHeader";
import { downloadCsv, percentOf, trendOf } from "./trend";
import "./pages.css";

type Choice = PeriodKind | "custom";
const SPECIES: Species[] = ["cat", "dog", "rabbit", "other"];
const METHODS: PaymentMethod[] = ["cash", "qris", "transfer", "ewallet", "card"];
const KINDS: PaymentKind[] = ["deposit", "payment", "refund"];

/** How full the hotel was, what came in and where it came from, for any period, one unit or one species. */
export function ReportsPage() {
  const { data } = useStore();
  const { t, locale } = useAppT();
  const r = t.reportsPage;
  const [today] = useState(todayISO);
  const [choice, setChoice] = useState<Choice>("thisMonth");
  const [custom, setCustom] = useState(() => ({ from: periodRange("thisMonth", today).from, to: today }));
  const [filter, setFilter] = useState<ReportFilter>(NO_REPORT_FILTER);

  const period = useMemo(() => (choice === "custom" ? customPeriod(custom.from, custom.to) : periodRange(choice, today)), [choice, custom, today]);
  const report = useMemo(() => reportFor(data, period, filter), [data, period, filter]);
  const before = useMemo(() => reportFor(data, previousPeriod(period), filter), [data, period, filter]);

  const rp = (n: number) => formatRupiah(n, locale);
  const pct = (x: number) => percentOf(x, locale);
  const num = (n: number) => new Intl.NumberFormat(locale === "id" ? "id-ID" : "en-GB", { maximumFractionDigits: 1 }).format(n);
  const day = (d: string) => formatDate(d, locale, { day: "numeric", month: "short" });
  const vs = (now: number, was: number, good = true) => trendOf(now, was, locale, r.vsPrevious, good);
  const filtered = filter.unitId !== "all" || filter.species !== "all";
  const lastDay = addDays(period.to, -1);

  // Ticks: the first of each month on long periods, every Monday on short ones.
  const tick = (date: string, i: number) => {
    if (report.days > 45) return date.endsWith("-01") || i === 0 ? formatDate(date, locale, { month: "short" }) : "";
    return i === 0 || i === report.days - 1 ? day(date) : "";
  };

  const unitName = (id: string) => data.cages.find((c) => c.id === id)?.name ?? "—";
  const inPeriod = data.bookings.filter((b) => b.checkIn >= period.from && b.checkIn < period.to && matchesFilter(data, b, filter));

  return (
    <>
      <PageHeader art="feature-care" title={r.title} lead={r.lead} />

      <div className="pg-reportfilters">
        <Segmented<Choice> label={r.period} value={choice} onChange={setChoice} options={[...PERIOD_KINDS, "custom" as const].map((k) => ({ value: k, label: r.periods[k] }))} />
        <div className="pg-toolbar">
          {choice === "custom" && (
            <>
              <Field label={r.from}>
                <Input type="date" value={custom.from} onChange={(e) => e.target.value && setCustom((c) => ({ ...c, from: e.target.value }))} />
              </Field>
              <Field label={r.to}>
                <Input type="date" value={custom.to} onChange={(e) => e.target.value && setCustom((c) => ({ ...c, to: e.target.value }))} />
              </Field>
            </>
          )}
          <Field label={r.unit}>
            <Select value={filter.unitId} onChange={(e) => setFilter((f) => ({ ...f, unitId: e.target.value }))}>
              <option value="all">{r.allUnits}</option>
              {data.cages.filter((c) => !c.archived).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={r.species}>
            <Select value={filter.species} onChange={(e) => setFilter((f) => ({ ...f, species: e.target.value as ReportFilter["species"] }))}>
              <option value="all">{r.allSpecies}</option>
              {SPECIES.map((s) => (
                <option key={s} value={s}>
                  {t.common.species[s]}
                </option>
              ))}
            </Select>
          </Field>
          {filtered && (
            <Button variant="ghost" size="sm" icon="x" onClick={() => setFilter(NO_REPORT_FILTER)}>
              {r.clear}
            </Button>
          )}
          <span className="pg-toolbar__count">{r.range(day(period.from), day(lastDay))}</span>
        </div>
      </div>

      {data.cages.length === 0 ? (
        <EmptyState art="app-cage" action={<Button to="/app/cages" size="sm">{t.nav.cages}</Button>}>{r.noCages}</EmptyState>
      ) : (
        <>
          <div className="pg-stats pg-stats--wide">
            <StatCard label={r.occupancy} value={pct(report.occupancy)} tone="ok" note={r.occupancyNote(report.occupiedNights, report.availableNights)} trend={vs(report.occupancy, before.occupancy)} />
            <StatCard label={r.received} value={rp(report.received)} tone="brand" note={r.receivedNote} trend={vs(report.received, before.received)} />
            <StatCard label={r.stays} value={report.stays} tone="info" note={r.staysNote(rp(report.value))} trend={vs(report.stays, before.stays)} />
            <StatCard label={r.averageRate} value={report.soldNights ? rp(Math.round(report.averageRate)) : "–"} tone="neutral" note={report.soldNights ? r.averageRateNote(report.soldNights) : undefined} trend={vs(report.averageRate, before.averageRate)} />
          </div>
          <div className="pg-stats pg-stats--compact">
            <StatCard label={r.averageNights} value={report.stays ? r.nightsUnit(num(report.averageNights)) : "–"} />
            <StatCard label={r.leadTime} value={report.leadDays !== null ? r.leadDays(num(report.leadDays)) : "–"} note={r.leadNote} />
            <StatCard label={r.repeat} value={report.stays ? pct(report.repeatStays / report.stays) : "–"} note={report.stays ? r.repeatNote(report.repeatStays, report.stays) : undefined} />
            <StatCard label={r.cancelled} value={report.cancelled} tone={report.cancelled ? "warn" : "neutral"} note={report.noShows ? r.noShows(report.noShows) : undefined} />
            <StatCard label={r.addOns} value={rp(report.addOns)} />
            <StatCard label={r.discounts} value={rp(report.discounts)} />
          </div>

          <ColumnChart
            title={r.chartTitle}
            summary={r.chartSummary(pct(report.occupancy))}
            scale={r.chartScale(report.places)}
            max={report.places}
            columns={report.daily.map((d, i) => ({ key: d.date, value: d.occupied, label: r.chartLabel(day(d.date), d.occupied, report.places), tick: tick(d.date, i) }))}
          />
          {report.stays === 0 && <Muted>{r.noStays}</Muted>}

          <div className="pg-columns">
            <ColumnChart
              title={r.weekdayTitle}
              tone="info"
              max={1}
              scale="100%"
              columns={report.weekdays.map((w, i) => ({ key: String(i), value: w ?? 0, label: w === null ? r.weekdayNone(r.weekdays[i]) : r.weekdayLabel(r.weekdays[i], pct(w)), tick: r.weekdays[i] }))}
            />
            <BarList
              title={r.sourceTitle}
              empty={r.noData}
              rows={report.bySource.map((s) => ({ key: s.source, label: t.bookingForm.sources[s.source], value: s.stays, display: r.staysCount(s.stays), note: rp(s.value) }))}
            />
            <BarList
              title={r.methodTitle}
              tone="brand"
              empty={r.noMoney}
              rows={METHODS.filter((m) => report.byMethod[m] !== 0).map((m) => ({ key: m, label: t.payments.methods[m], value: report.byMethod[m], display: rp(report.byMethod[m]) }))}
            />
            <BarList
              title={r.kindTitle}
              tone="brand"
              empty={r.noMoney}
              rows={KINDS.filter((k) => report.byKind[k] > 0).map((k) => ({ key: k, label: t.payments.kinds[k], value: report.byKind[k], display: k === "refund" ? `−${rp(report.byKind[k])}` : rp(report.byKind[k]) }))}
            />
            <BarList
              title={r.speciesTitle}
              tone="ok"
              empty={r.noData}
              rows={report.bySpecies.map((s) => ({ key: s.species, label: t.common.species[s.species], value: s.pets, display: r.petsCount(s.pets), note: rp(s.value) }))}
            />
            <BarList
              title={r.customersTitle}
              tone="ok"
              empty={r.noData}
              rows={report.topCustomers.map((c) => ({ key: c.owner.id, label: c.owner.name, href: `/app/customers/${c.owner.id}`, value: c.value, display: rp(c.value), note: r.staysCount(c.stays) }))}
            />
          </div>

          <section className="pg-section">
            <Heading level={2} size="md">{r.unitTitle}</Heading>
            <div className="pg-tablewrap" role="region" tabIndex={0} aria-label={r.unitTitle}>
              <table className="pg-table">
                <caption className="ds-sr">{r.unitTitle}</caption>
                <thead>
                  <tr>
                    <th scope="col">{r.unitColumns.unit}</th>
                    <th scope="col" className="num">{r.unitColumns.occupancy}</th>
                    <th scope="col" className="num">{r.unitColumns.nights}</th>
                    <th scope="col" className="num">{r.unitColumns.stays}</th>
                    <th scope="col" className="num">{r.unitColumns.value}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...report.byUnit]
                    .sort((a, b) => b.occupancy - a.occupancy || a.cage.name.localeCompare(b.cage.name))
                    .map((u) => (
                      <tr key={u.cage.id}>
                        <td>
                          {unitName(u.cage.id)}
                          {u.cage.capacity > 1 && <small className="pg-table__sub">{r.sharedRoom(u.cage.capacity)}</small>}
                        </td>
                        <td className="num">
                          <span className="pg-meter" aria-hidden="true"><i style={{ width: `${Math.round(u.occupancy * 100)}%` }} /></span>
                          {pct(u.occupancy)}
                        </td>
                        <td className="num">{u.occupiedNights}/{u.availableNights}</td>
                        <td className="num">{u.stays}</td>
                        <td className="num">{rp(u.value)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <section className="pg-section">
        <Heading level={2} size="md">{r.exportTitle}</Heading>
        <Muted>{r.exportNote}</Muted>
        <div className="pg-toolbar">
          <Button variant="secondary" icon="download" onClick={() => downloadCsv(`pethommie-stays-${period.from}-${lastDay}.csv`, staysCsv(data, inPeriod))} disabled={inPeriod.length === 0}>
            {r.exportPeriod}
          </Button>
          <Button variant="ghost" icon="download" onClick={() => downloadCsv(`pethommie-stays-${today}.csv`, staysCsv(data))}>
            {r.exportCsv}
          </Button>
        </div>
      </section>
    </>
  );
}
