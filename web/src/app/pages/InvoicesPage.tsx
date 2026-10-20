import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { invoicesCsv } from "@/app/domain/csv";
import { formatDate, formatRupiah, todayISO } from "@/app/domain/logic";
import { invoicesIn, registerSummary } from "@/app/domain/invoices";
import { useStore } from "@/app/store/AppStore";
import { useAppT } from "@/app/i18n/useAppT";
import { Badge } from "@/app/design-system/atoms/Badge";
import { Button } from "@/app/design-system/atoms/Button";
import { Input } from "@/app/design-system/atoms/Input";
import { Muted } from "@/app/design-system/atoms/Text";
import { EmptyState } from "@/app/design-system/molecules/EmptyState";
import { Field } from "@/app/design-system/molecules/Field";
import { StatCard } from "@/app/design-system/molecules/StatCard";
import { PageHeader } from "@/app/design-system/organisms/PageHeader";
import "./pages.css";

/** Every invoice of a month: the register, with what it adds up to, and a spreadsheet of it. */
export function InvoicesPage() {
  const { data } = useStore();
  const { t, locale } = useAppT();
  const p = t.invoicesPage;
  const [month, setMonth] = useState(() => todayISO().slice(0, 7));
  const list = useMemo(() => invoicesIn(data.invoices, month), [data.invoices, month]);
  const sum = registerSummary(list);
  const rp = (n: number) => formatRupiah(n, locale);

  function download() {
    const blob = new Blob(["﻿", invoicesCsv(data, list)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `pethommie-invoices-${month}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <>
      <PageHeader title={p.title} lead={p.lead} />
      <div className="pg-toolbar">
        <Field label={p.month}>
          <Input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
        </Field>
        <Button variant="secondary" icon="download" onClick={download} disabled={list.length === 0}>
          {p.exportCsv}
        </Button>
      </div>

      <div className="pg-stats pg-stats--wide">
        <StatCard label={p.count} value={sum.count} tone="info" note={p.voidedCount(sum.voided) || undefined} />
        <StatCard label={p.beforeTax} value={rp(sum.subtotal)} tone="neutral" />
        <StatCard label={p.tax} value={rp(sum.tax)} tone="neutral" />
        <StatCard label={p.total} value={rp(sum.total)} tone="brand" />
      </div>

      {list.length ? (
        <div className="pg-tablewrap" role="region" tabIndex={0} aria-label={p.title}>
          <table className="pg-table">
            <caption className="ds-sr">{p.title}</caption>
            <thead>
              <tr>
                <th scope="col">{p.columns.number}</th>
                <th scope="col">{p.columns.date}</th>
                <th scope="col">{p.columns.customer}</th>
                <th scope="col">{p.columns.pet}</th>
                <th scope="col" className="num">{p.columns.total}</th>
                <th scope="col">{p.columns.status}</th>
              </tr>
            </thead>
            <tbody>
              {list.map((i) => (
                <tr key={i.id} className={i.status === "void" ? "is-void" : ""}>
                  <td>
                    <Link to={`/app/invoices/${i.id}`}>{i.number}</Link>
                  </td>
                  <td>{formatDate(i.issuedOn, locale, { day: "numeric", month: "short" })}</td>
                  <td>{i.customer.name || "—"}</td>
                  <td>{i.petNames}</td>
                  <td className="num">{rp(i.total)}</td>
                  <td>
                    <Badge tone={i.status === "void" ? "neutral" : "ok"}>{p.status[i.status]}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState art="reservation">
          {p.empty}
          <br />
          <Muted>{p.emptyHint}</Muted>
        </EmptyState>
      )}
    </>
  );
}
