import { useMemo, useState } from "react";
import { DIRECT_COSTS, EXPENSE_CATEGORIES, FINANCE_PERIODS, financeMonths, isDirect, monthsBetween, previousMonth, profitLoss, profitLossCsv, type Basis, type FinancePeriod, type Month } from "@/app/domain/finance";
import { formatDate, formatRupiah, todayISO } from "@/app/domain/logic";
import { useStore } from "@/app/store/AppStore";
import { useAppT } from "@/app/i18n/useAppT";
import { Button } from "@/app/design-system/atoms/Button";
import { Heading, Muted } from "@/app/design-system/atoms/Text";
import { Alert } from "@/app/design-system/molecules/Alert";
import { Segmented } from "@/app/design-system/molecules/Segmented";
import { StatCard } from "@/app/design-system/molecules/StatCard";
import { BarList } from "@/app/design-system/organisms/BarList";
import { PageHeader } from "@/app/design-system/organisms/PageHeader";
import { PairChart } from "@/app/design-system/organisms/PairChart";
import { SignedChart } from "@/app/design-system/organisms/SignedChart";
import { downloadCsv, percentOf, trendOf } from "./trend";
import "./pages.css";

/** The months just before these, as many of them. */
const before = (months: Month[]) => {
  let end = previousMonth(months[0]);
  const out: Month[] = [];
  for (let i = 0; i < months.length; i++) {
    out.unshift(end);
    end = previousMonth(end);
  }
  return out;
};

/** At least six months for the charts: the period, or the six months up to its end. */
const chartMonths = (months: Month[]) => {
  if (months.length >= 6) return months;
  let start = months[months.length - 1];
  for (let i = 0; i < 5; i++) start = previousMonth(start);
  return monthsBetween(start, months[months.length - 1]);
};

/** Profit and loss for the owner: income, expenses and what is left, with charts, a statement, and the break-even. */
export function FinancePage() {
  const { data } = useStore();
  const { t, locale } = useAppT();
  const x = t.financePage;
  const cat = t.expenseCategories;
  const [today] = useState(todayISO);
  const [period, setPeriod] = useState<FinancePeriod>("thisMonth");
  const [basis, setBasis] = useState<Basis>(data.settings.tax.basis);

  const months = useMemo(() => financeMonths(period, today), [period, today]);
  const pl = useMemo(() => profitLoss(data, months, basis), [data, months, basis]);
  const prev = useMemo(() => profitLoss(data, before(months), basis), [data, months, basis]);
  const chart = useMemo(() => profitLoss(data, chartMonths(months), basis), [data, months, basis]);

  const rp = (n: number) => formatRupiah(Math.round(n), locale);
  const pct = (n: number) => percentOf(n, locale);
  const num = (n: number) => new Intl.NumberFormat(locale === "id" ? "id-ID" : "en-GB", { maximumFractionDigits: 0 }).format(n);
  const monthName = (m: Month, long = false) => formatDate(`${m}-01`, locale, long ? { month: "long", year: "numeric" } : { month: "short" });
  // A month still running isn't compared with a whole one: the numbers would mislead.
  const running = months.includes(today.slice(0, 7));
  const vs = (now: number, was: number, good = true) => (running ? undefined : trendOf(now, was, locale, x.vsPrevious, good));
  const gain = pl.netProfit >= 0;
  const taxed = data.settings.tax.regime === "final_umkm";

  // The statement, line by line: [label, amount, kind]
  const line = (label: string, amount: number, kind: "item" | "sub" | "total" = "item") => ({ label, amount, kind });
  const statement = [
    ...(basis === "cash"
      ? [line(x.lines.received, pl.revenue.received)]
      : [line(x.lines.boarding, pl.revenue.boarding), line(x.lines.addOns, pl.revenue.addOns), line(x.lines.discounts, -pl.revenue.discounts), line(x.lines.cancellationFees, pl.revenue.cancellationFees)]),
    line(x.lines.totalRevenue, pl.revenue.total, "total"),
    ...DIRECT_COSTS.filter((c) => pl.byCategory[c] > 0).map((c) => line(cat[c], -pl.byCategory[c])),
    line(x.lines.direct, -pl.direct, "sub"),
    line(x.lines.gross, pl.grossProfit, "total"),
    ...EXPENSE_CATEGORIES.filter((c) => !isDirect(c) && pl.byCategory[c] > 0).map((c) => line(cat[c], -pl.byCategory[c])),
    line(x.lines.operating, -pl.operating, "sub"),
    line(x.lines.net, pl.netProfit, "total"),
    ...(taxed ? [line(x.lines.tax, -pl.taxEstimate), line(x.lines.afterTax, pl.afterTax, "total")] : []),
  ];

  return (
    <>
      <PageHeader
        art="feature-tax"
        title={x.title}
        lead={x.lead}
        actions={
          <>
            <Button variant="secondary" icon="download" onClick={() => downloadCsv(`pethommie-profit-loss-${months[0]}-${months[months.length - 1]}.csv`, profitLossCsv(pl))}>
              {x.exportCsv}
            </Button>
            <Button variant="ghost" icon="printer" onClick={() => window.print()}>
              {x.print}
            </Button>
          </>
        }
      />

      <div className="pg-reportfilters no-print">
        <Segmented<FinancePeriod> label={x.period} value={period} onChange={setPeriod} options={FINANCE_PERIODS.map((k) => ({ value: k, label: x.periods[k] }))} />
        <div className="pg-toolbar">
          <span className="pg-toolbar__label">{x.basis}</span>
          <Segmented<Basis>
            label={x.basis}
            value={basis}
            onChange={setBasis}
            options={[
              { value: "cash", label: x.bases.cash },
              { value: "accrual", label: x.bases.accrual },
            ]}
          />
        </div>
        <Muted>{x.basisNote[basis]}</Muted>
      </div>
      <p className="pg-finance__period">
        {months.length === 1 ? monthName(months[0], true) : `${monthName(months[0], true)} – ${monthName(months[months.length - 1], true)}`}
        {running && <small> · {x.runningNote(formatDate(today, locale, { day: "numeric", month: "short" }))}</small>}
      </p>

      {pl.expenses === 0 && (
        <Alert tone="info">
          {x.noExpenses}{" "}
          <Button size="sm" variant="secondary" to="/app/expenses">
            {x.recordExpenses}
          </Button>
        </Alert>
      )}

      <div className="pg-stats pg-stats--wide">
        <StatCard label={x.revenue} value={rp(pl.revenue.total)} tone="info" trend={vs(pl.revenue.total, prev.revenue.total)} />
        <StatCard label={x.expenses} value={rp(pl.expenses)} tone="brand" trend={vs(pl.expenses, prev.expenses, false)} />
        <StatCard label={gain ? x.profit : x.loss} value={rp(pl.netProfit)} tone={gain ? "ok" : "danger"} note={pl.margin !== null ? x.margin(pct(pl.margin)) : undefined} trend={vs(pl.netProfit, prev.netProfit)} />
        {taxed && <StatCard label={x.lines.afterTax} value={rp(pl.afterTax)} tone="neutral" note={`${x.lines.tax}: ${rp(pl.taxEstimate)}`} />}
      </div>

      <div className="pg-columns">
        <PairChart
          title={x.chartTitle}
          aLabel={x.legendIncome}
          bLabel={x.legendExpenses}
          items={chart.months.map((m) => ({ key: m.month, tick: monthName(m.month), a: m.revenue, b: m.expenses, label: x.chartLabel(monthName(m.month, true), rp(m.revenue), rp(m.expenses)) }))}
        />
        <SignedChart
          title={x.profitChartTitle}
          summary={rp(chart.netProfit)}
          columns={chart.months.map((m) => ({ key: m.month, tick: monthName(m.month), value: m.profit, label: x.profitLabel(monthName(m.month, true), rp(m.profit)) }))}
        />
      </div>

      <div className="pg-columns">
        <section className="pg-panel pg-statement" aria-label={x.statementTitle}>
          <h2 className="pg-panel__title">{x.statementTitle}</h2>
          <table className="pg-statement__table">
            <caption className="ds-sr">{x.statementTitle}</caption>
            <tbody>
              {statement.map((l, i) => (
                <tr key={`${l.label}-${i}`} className={`is-${l.kind}${l.amount < 0 && l.kind === "total" ? " is-negative" : ""}`}>
                  <th scope="row">{l.label}</th>
                  <td>{rp(l.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <div className="pg-finance__side">
          <BarList
            title={x.costsTitle}
            tone="brand"
            empty={x.noExpenses}
            rows={EXPENSE_CATEGORIES.filter((c) => pl.byCategory[c] > 0)
              .sort((a, b) => pl.byCategory[b] - pl.byCategory[a])
              .map((c) => ({ key: c, label: cat[c], value: pl.byCategory[c], display: rp(pl.byCategory[c]), note: pl.expenses ? pct(pl.byCategory[c] / pl.expenses) : undefined }))}
          />

          <section className="pg-panel" aria-label={x.perNightTitle}>
            <h2 className="pg-panel__title">{x.perNightTitle}</h2>
            <Muted>{x.nightsSold(num(pl.occupiedNights))}</Muted>
            <dl className="pg-pernight">
              <div>
                <dt>{x.revenuePerNight}</dt>
                <dd>{pl.revenuePerNight !== null ? rp(pl.revenuePerNight) : "–"}</dd>
              </div>
              <div>
                <dt>{x.costPerNight}</dt>
                <dd>{pl.costPerNight !== null ? rp(pl.costPerNight) : "–"}</dd>
              </div>
              <div>
                <dt>{x.directPerNight}</dt>
                <dd>{pl.directPerNight !== null ? rp(pl.directPerNight) : "–"}</dd>
              </div>
            </dl>
          </section>

          <section className="pg-panel" aria-label={x.breakEvenTitle}>
            <h2 className="pg-panel__title">{x.breakEvenTitle}</h2>
            {pl.occupiedNights === 0 || pl.expenses === 0 ? (
              <Muted>{x.breakEvenNoData}</Muted>
            ) : pl.breakEven ? (
              <>
                <p className="pg-breakeven">
                  <b>{x.breakEven(num(Math.ceil(pl.breakEven.nightsPerMonth)))}</b>
                  {pl.breakEven.occupancy !== null && ` ${x.breakEvenOcc(pct(pl.breakEven.occupancy))}`}
                </p>
                <Muted>{x.breakEvenNow(num(pl.nightsPerMonth))}</Muted>
                <span className="pg-meter pg-meter--wide" aria-hidden="true">
                  <i style={{ width: `${Math.min(100, Math.round((pl.nightsPerMonth / Math.max(1, pl.breakEven.nightsPerMonth)) * 100))}%` }} className={pl.nightsPerMonth >= pl.breakEven.nightsPerMonth ? "" : "is-short"} />
                </span>
              </>
            ) : (
              <Muted>{x.breakEvenNone}</Muted>
            )}
          </section>
        </div>
      </div>

      <section className="pg-section">
        <Heading level={2} size="sm">{x.honest}</Heading>
      </section>
    </>
  );
}
