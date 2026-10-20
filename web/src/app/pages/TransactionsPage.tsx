import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ledger, ledgerCsv, ledgerTotals, NO_LEDGER_FILTER, type LedgerFilter } from "@/app/domain/ledger";
import { addDays, dayOf, formatDate, formatRupiah, timeOf, todayISO } from "@/app/domain/logic";
import { customPeriod, PERIOD_KINDS, periodRange, type PeriodKind } from "@/app/domain/reports";
import type { PaymentKind, PaymentMethod } from "@/app/domain/types";
import { useStore } from "@/app/store/AppStore";
import { useAppT } from "@/app/i18n/useAppT";
import { Badge } from "@/app/design-system/atoms/Badge";
import { Button } from "@/app/design-system/atoms/Button";
import { Input, Select } from "@/app/design-system/atoms/Input";
import { Muted } from "@/app/design-system/atoms/Text";
import { EmptyState } from "@/app/design-system/molecules/EmptyState";
import { Field } from "@/app/design-system/molecules/Field";
import { FilterBar } from "@/app/design-system/molecules/FilterBar";
import { SearchField } from "@/app/design-system/molecules/SearchField";
import { Segmented } from "@/app/design-system/molecules/Segmented";
import { StatCard } from "@/app/design-system/molecules/StatCard";
import { BarList } from "@/app/design-system/organisms/BarList";
import { PageHeader } from "@/app/design-system/organisms/PageHeader";
import { downloadCsv } from "./trend";
import "./pages.css";

type Choice = PeriodKind | "custom";
const METHODS: PaymentMethod[] = ["cash", "qris", "transfer", "ewallet", "card"];
const KINDS: PaymentKind[] = ["deposit", "payment", "refund"];
const kindTone = { deposit: "info", payment: "ok", refund: "danger" } as const;

/** The cash book: every payment and refund in a period, filtered, totalled per method, with its receipt. */
export function TransactionsPage() {
  const { data } = useStore();
  const { t, locale } = useAppT();
  const x = t.transactionsPage;
  const r = t.reportsPage;
  const [today] = useState(todayISO);
  const [choice, setChoice] = useState<Choice>("thisMonth");
  const [custom, setCustom] = useState(() => ({ from: periodRange("thisMonth", today).from, to: today }));
  const [f, setF] = useState<LedgerFilter>(NO_LEDGER_FILTER);
  const set = (patch: Partial<LedgerFilter>) => setF((prev) => ({ ...prev, ...patch }));

  const period = useMemo(() => (choice === "custom" ? customPeriod(custom.from, custom.to) : periodRange(choice, today)), [choice, custom, today]);
  const rows = useMemo(() => ledger(data, period, f), [data, period, f]);
  const totals = ledgerTotals(rows);
  const rp = (n: number) => formatRupiah(n, locale);
  const day = (d: string) => formatDate(d, locale, { day: "numeric", month: "short" });
  const filtered = f.q !== "" || f.method !== "all" || f.kind !== "all";

  return (
    <>
      <PageHeader art="feature-payments" title={x.title} lead={x.lead} />
      <Segmented<Choice> label={r.period} value={choice} onChange={setChoice} options={[...PERIOD_KINDS, "custom" as const].map((k) => ({ value: k, label: r.periods[k] }))} />
      {choice === "custom" && (
        <div className="pg-toolbar">
          <Field label={r.from}>
            <Input type="date" value={custom.from} onChange={(e) => e.target.value && setCustom((c) => ({ ...c, from: e.target.value }))} />
          </Field>
          <Field label={r.to}>
            <Input type="date" value={custom.to} onChange={(e) => e.target.value && setCustom((c) => ({ ...c, to: e.target.value }))} />
          </Field>
        </div>
      )}
      <SearchField value={f.q} onChange={(q) => set({ q })} placeholder={x.searchPh} />
      <FilterBar count={`${x.count(totals.count)} · ${r.range(day(period.from), day(addDays(period.to, -1)))}`} active={filtered} onClear={() => setF(NO_LEDGER_FILTER)} clearLabel={t.filters.clear}>
        <Field label={x.method}>
          <Select value={f.method} onChange={(e) => set({ method: e.target.value as LedgerFilter["method"] })}>
            <option value="all">{x.any}</option>
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {t.payments.methods[m]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={x.kind}>
          <Select value={f.kind} onChange={(e) => set({ kind: e.target.value as LedgerFilter["kind"] })}>
            <option value="all">{x.any}</option>
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {t.payments.kinds[k]}
              </option>
            ))}
          </Select>
        </Field>
      </FilterBar>

      <div className="pg-stats pg-stats--wide">
        <StatCard label={x.moneyIn} value={rp(totals.moneyIn)} tone="ok" />
        <StatCard label={x.refunds} value={rp(totals.refunds)} tone={totals.refunds ? "warn" : "neutral"} />
        <StatCard label={x.net} value={rp(totals.net)} tone="brand" />
      </div>

      {rows.length ? (
        <>
          <BarList
            title={x.byMethodTitle}
            tone="brand"
            empty={x.empty}
            rows={METHODS.filter((m) => totals.byMethod[m] !== 0).map((m) => ({ key: m, label: t.payments.methods[m], value: totals.byMethod[m], display: rp(totals.byMethod[m]) }))}
          />
          <div className="pg-tablewrap" role="region" tabIndex={0} aria-label={x.title}>
            <table className="pg-table">
              <caption className="ds-sr">{x.title}</caption>
              <thead>
                <tr>
                  <th scope="col">{x.columns.receipt}</th>
                  <th scope="col">{x.columns.date}</th>
                  <th scope="col">{x.columns.who}</th>
                  <th scope="col">{x.columns.kind}</th>
                  <th scope="col">{x.columns.method}</th>
                  <th scope="col">{x.columns.reference}</th>
                  <th scope="col" className="num">{x.columns.amount}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ booking, payment, owner, pets, receipt }) => (
                  <tr key={payment.id}>
                    <td>
                      <Link to={`/app/receipts/${booking.id}/${payment.id}`}>{receipt}</Link>
                    </td>
                    <td>
                      {day(dayOf(payment.at))} <small className="pg-table__sub">{timeOf(payment.at, locale)}</small>
                    </td>
                    <td>
                      <Link to={`/app/bookings/${booking.id}`}>{pets || "—"}</Link>
                      <small className="pg-table__sub">{owner?.name ?? "—"}</small>
                    </td>
                    <td>
                      <Badge tone={kindTone[payment.kind]}>{t.payments.kinds[payment.kind]}</Badge>
                    </td>
                    <td>{t.payments.methods[payment.method]}</td>
                    <td>{payment.reference || "—"}</td>
                    <td className="num">{payment.kind === "refund" ? `−${rp(payment.amount)}` : rp(payment.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <EmptyState art="feature-payments">{x.empty}</EmptyState>
      )}

      <div className="pg-toolbar">
        <Button variant="secondary" icon="download" disabled={rows.length === 0} onClick={() => downloadCsv(`pethommie-transactions-${period.from}.csv`, ledgerCsv(rows))}>
          {x.exportCsv}
        </Button>
        <Muted>{x.hint}</Muted>
      </div>
    </>
  );
}
