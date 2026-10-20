import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { invoicesCsv } from "@/app/domain/csv";
import { formatDate, formatRupiah, todayISO } from "@/app/domain/logic";
import { registerSummary } from "@/app/domain/invoices";
import { daysLate, invoiceBalance, invoiceState, type InvoiceState } from "@/app/domain/ledger";
import { useStore } from "@/app/store/AppStore";
import { useAppT } from "@/app/i18n/useAppT";
import { Badge, type Tone } from "@/app/design-system/atoms/Badge";
import { Button } from "@/app/design-system/atoms/Button";
import { Checkbox } from "@/app/design-system/atoms/Checkbox";
import { Input } from "@/app/design-system/atoms/Input";
import { Muted } from "@/app/design-system/atoms/Text";
import { EmptyState } from "@/app/design-system/molecules/EmptyState";
import { Field } from "@/app/design-system/molecules/Field";
import { SearchField } from "@/app/design-system/molecules/SearchField";
import { Segmented } from "@/app/design-system/molecules/Segmented";
import { StatCard } from "@/app/design-system/molecules/StatCard";
import { PageHeader } from "@/app/design-system/organisms/PageHeader";
import { downloadCsv } from "./trend";
import "./pages.css";

type Show = "all" | "unpaid" | "overdue" | "paid" | "void";
const SHOWS: Show[] = ["all", "unpaid", "overdue", "paid", "void"];
const stateTone: Record<InvoiceState, Tone> = { paid: "ok", partial: "warn", unpaid: "warn", overdue: "danger", void: "neutral", unknown: "neutral" };
/** "unpaid" covers every invoice with money owed (not paid, part paid, past due). */
const shows = (s: Show, state: InvoiceState) => s === "all" || s === state || (s === "unpaid" && (state === "unpaid" || state === "partial" || state === "overdue"));

/** The invoice register: by month or all of it, what's paid and what's late, searchable, with a spreadsheet of it. */
export function InvoicesPage() {
  const { data } = useStore();
  const { t, locale } = useAppT();
  const p = t.invoicesPage;
  const [today] = useState(todayISO);
  const [month, setMonth] = useState(() => today.slice(0, 7));
  const [allMonths, setAllMonths] = useState(false);
  const [show, setShow] = useState<Show>("all");
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return data.invoices
      .filter((i) => allMonths || i.issuedOn.startsWith(month))
      .filter((i) => !needle || [i.number, i.customer.name, i.petNames].some((s) => s.toLowerCase().includes(needle)))
      .map((invoice) => ({ invoice, state: invoiceState(data, invoice, today), balance: invoiceBalance(data, invoice) }))
      .sort((a, b) => b.invoice.issuedOn.localeCompare(a.invoice.issuedOn) || b.invoice.number.localeCompare(a.invoice.number));
  }, [data, month, allMonths, q, today]);
  const shown = rows.filter((r) => shows(show, r.state));
  const sum = registerSummary(rows.map((r) => r.invoice));
  const owed = rows.filter((r) => r.balance > 0);
  const late = rows.filter((r) => r.state === "overdue");
  const rp = (n: number) => formatRupiah(n, locale);
  const day = (d: string) => formatDate(d, locale, { day: "numeric", month: "short" });

  return (
    <>
      <PageHeader art="feature-payments" title={p.title} lead={p.lead} />
      <div className="pg-toolbar">
        <Field label={p.month}>
          <Input type="month" value={month} disabled={allMonths} onChange={(e) => e.target.value && setMonth(e.target.value)} />
        </Field>
        <Checkbox label={p.allMonths} checked={allMonths} onChange={(e) => setAllMonths(e.target.checked)} />
        <Button variant="secondary" icon="download" onClick={() => downloadCsv(`pethommie-invoices-${allMonths ? "all" : month}.csv`, invoicesCsv(data, shown.map((r) => r.invoice)))} disabled={shown.length === 0}>
          {p.exportCsv}
        </Button>
      </div>

      <div className="pg-stats pg-stats--wide">
        <StatCard label={p.count} value={sum.count} tone="info" note={p.voidedCount(sum.voided) || undefined} />
        <StatCard label={p.total} value={rp(sum.total)} tone="brand" note={sum.tax ? `${p.tax} ${rp(sum.tax)}` : undefined} />
        <StatCard label={p.outstanding} value={rp(owed.reduce((s, r) => s + r.balance, 0))} tone={owed.length ? "warn" : "ok"} note={owed.length ? p.outstandingNote(owed.length) : undefined} />
        <StatCard label={p.overdue} value={late.length} tone={late.length ? "danger" : "neutral"} note={late.length ? p.overdueNote(rp(late.reduce((s, r) => s + r.balance, 0))) : undefined} />
      </div>

      <SearchField value={q} onChange={setQ} placeholder={p.searchPh} />
      <Segmented<Show> label={p.title} value={show} onChange={setShow} options={SHOWS.map((s) => ({ value: s, label: p.states[s], count: rows.filter((r) => shows(s, r.state)).length }))} />

      {shown.length ? (
        <div className="pg-tablewrap" role="region" tabIndex={0} aria-label={p.title}>
          <table className="pg-table">
            <caption className="ds-sr">{p.title}</caption>
            <thead>
              <tr>
                <th scope="col">{p.columns.number}</th>
                <th scope="col">{p.columns.date}</th>
                <th scope="col">{p.columns.customer}</th>
                <th scope="col" className="num">{p.columns.total}</th>
                <th scope="col" className="num">{p.columns.balance}</th>
                <th scope="col">{p.columns.due}</th>
                <th scope="col">{p.columns.status}</th>
              </tr>
            </thead>
            <tbody>
              {shown.map(({ invoice: i, state, balance }) => (
                <tr key={i.id} className={i.status === "void" ? "is-void" : ""}>
                  <td>
                    <Link to={`/app/invoices/${i.id}`}>{i.number}</Link>
                  </td>
                  <td>{day(i.issuedOn)}</td>
                  <td>
                    {i.customer.name || "—"}
                    <small className="pg-table__sub">{i.petNames}</small>
                  </td>
                  <td className="num">{rp(i.total)}</td>
                  <td className="num">{balance ? rp(balance) : "—"}</td>
                  <td>
                    {i.dueOn ? day(i.dueOn) : "—"}
                    {state === "overdue" && <small className="pg-table__sub pg-late">{p.late(daysLate(i, today))}</small>}
                  </td>
                  <td>
                    <Badge tone={stateTone[state]}>{p.states[state]}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState art="feature-payments">
          {rows.length ? p.emptyFilter : p.empty}
          {!rows.length && (
            <>
              <br />
              <Muted>{p.emptyHint}</Muted>
            </>
          )}
        </EmptyState>
      )}
    </>
  );
}
