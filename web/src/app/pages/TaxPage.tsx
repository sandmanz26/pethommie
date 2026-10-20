import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { formatDate, formatRupiah, todayISO } from "@/app/domain/logic";
import { FINAL_SCHEME_CEILING, TAX_RULES_AS_OF, taxCsv, taxFor } from "@/app/domain/tax";
import { useStore } from "@/app/store/AppStore";
import { useAppT } from "@/app/i18n/useAppT";
import { Button } from "@/app/design-system/atoms/Button";
import { Select } from "@/app/design-system/atoms/Input";
import { Muted } from "@/app/design-system/atoms/Text";
import { Alert } from "@/app/design-system/molecules/Alert";
import { Field } from "@/app/design-system/molecules/Field";
import { StatCard } from "@/app/design-system/molecules/StatCard";
import { PageHeader } from "@/app/design-system/organisms/PageHeader";
import "./pages.css";

/** Turnover and estimated tax by month, with a spreadsheet for the accountant. An estimate, never a filing. */
export function TaxPage() {
  const { data } = useStore();
  const { t, locale } = useAppT();
  const p = t.taxPage;
  const thisYear = Number(todayISO().slice(0, 4));
  const [year, setYear] = useState(thisYear);
  const profile = data.settings.tax;
  const tax = useMemo(() => taxFor(data, year), [data, year]);
  const rp = (n: number) => formatRupiah(n, locale);
  const years = [thisYear, thisYear - 1, thisYear - 2];
  const percent = `${Math.round(tax.ceilingUsed * 100)}%`;

  function download() {
    const blob = new Blob(["﻿", taxCsv(tax, profile)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `pethommie-tax-${year}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <>
      <PageHeader title={p.title} lead={p.lead} />
      <Alert tone="info">
        <b>{p.disclaimerTitle}.</b> {p.disclaimer(formatDate(TAX_RULES_AS_OF, locale, { day: "numeric", month: "long", year: "numeric" }))}
      </Alert>

      {profile.regime === "none" && (
        <Alert tone="warn">
          {p.notSet} <Link to="/app/settings#tax">{p.setUp}</Link>
        </Alert>
      )}

      <div className="pg-toolbar">
        <Field label={p.year}>
          <Select value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </Select>
        </Field>
        <Button variant="secondary" icon="download" onClick={download}>
          {p.exportCsv}
        </Button>
      </div>

      <Muted>
        {p.regimes[profile.regime]} · {p.basisLine(p.basis[profile.basis])}
      </Muted>
      {profile.regime === "final_umkm" && profile.taxpayer === "individual" && <Muted>{p.exemptNote}</Muted>}

      <div className="pg-stats pg-stats--wide">
        <StatCard label={p.turnover} value={rp(tax.turnover)} tone="brand" />
        {profile.regime === "final_umkm" && <StatCard label={p.pph} value={rp(tax.pph)} tone="info" />}
        {profile.pkp && <StatCard label={p.ppn} value={rp(tax.ppn)} tone="neutral" />}
      </div>

      {profile.regime === "final_umkm" && (
        <section className={`pg-meter pg-meter--${tax.ceiling}`} aria-label={p.ceilingTitle}>
          <b>{p.ceilingTitle}</b>
          <div className="pg-meter__bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.round(tax.ceilingUsed * 100))} aria-label={p.ceilingTitle}>
            <i style={{ width: `${Math.min(100, tax.ceilingUsed * 100)}%` }} />
          </div>
          <Muted>
            {p.ceilingUsed(percent)} · {rp(tax.turnover)} / {rp(FINAL_SCHEME_CEILING)}
          </Muted>
          {tax.ceiling === "near" && <Alert tone="warn">{p.ceilingNear}</Alert>}
          {tax.ceiling === "over" && <Alert tone="danger">{p.ceilingOver}</Alert>}
        </section>
      )}

      <div className="pg-tablewrap" role="region" tabIndex={0} aria-label={p.title}>
        <table className="pg-table">
          <caption className="ds-sr">{p.title} {year}</caption>
          <thead>
            <tr>
              <th scope="col">{p.columns.month}</th>
              <th scope="col" className="num">{p.columns.cash}</th>
              <th scope="col" className="num">{p.columns.accrual}</th>
              <th scope="col" className="num">{p.columns.cumulative}</th>
              {profile.regime === "final_umkm" && (
                <>
                  <th scope="col" className="num">{p.columns.taxable}</th>
                  <th scope="col" className="num">{p.columns.pph}</th>
                  <th scope="col">{p.columns.payBy}</th>
                </>
              )}
              {profile.pkp && (
                <>
                  <th scope="col" className="num">{p.columns.ppnBase}</th>
                  <th scope="col" className="num">{p.columns.ppn}</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {tax.months.map((m) => (
              <tr key={m.month}>
                <th scope="row">{formatDate(`${year}-${String(m.month).padStart(2, "0")}-01`, locale, { month: "long" })}</th>
                <td className="num">{rp(m.turnoverCash)}</td>
                <td className="num">{rp(m.turnoverAccrual)}</td>
                <td className="num">{rp(m.cumulative)}</td>
                {profile.regime === "final_umkm" && (
                  <>
                    <td className="num">{rp(m.taxable)}</td>
                    <td className="num">{rp(m.pph)}</td>
                    <td>{m.pph > 0 ? formatDate(m.dueOn, locale, { day: "numeric", month: "short" }) : "—"}</td>
                  </>
                )}
                {profile.pkp && (
                  <>
                    <td className="num">{rp(m.ppnBase)}</td>
                    <td className="num">{rp(m.ppn)}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">{p.total}</th>
              <td className="num">{rp(tax.months.reduce((s, m) => s + m.turnoverCash, 0))}</td>
              <td className="num">{rp(tax.months.reduce((s, m) => s + m.turnoverAccrual, 0))}</td>
              <td className="num">{rp(tax.turnover)}</td>
              {profile.regime === "final_umkm" && (
                <>
                  <td className="num">{rp(tax.months.reduce((s, m) => s + m.taxable, 0))}</td>
                  <td className="num">{rp(tax.pph)}</td>
                  <td />
                </>
              )}
              {profile.pkp && (
                <>
                  <td className="num">{rp(tax.ppnBase)}</td>
                  <td className="num">{rp(tax.ppn)}</td>
                </>
              )}
            </tr>
          </tfoot>
        </table>
      </div>

      {profile.regime === "final_umkm" && <Muted>{p.payNote}</Muted>}
      {!profile.pkp && <Muted>{p.ppnOff}</Muted>}
    </>
  );
}
