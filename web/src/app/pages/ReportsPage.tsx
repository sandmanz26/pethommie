import { useMemo, useState } from "react";
import { staysCsv } from "@/app/domain/csv";
import { formatRupiah, todayISO } from "@/app/domain/logic";
import { periodRange, reportFor, type PeriodKind } from "@/app/domain/reports";
import { useStore } from "@/app/store/AppStore";
import { useAppT } from "@/app/i18n/useAppT";
import { Button } from "@/app/design-system/atoms/Button";
import { Heading, Muted } from "@/app/design-system/atoms/Text";
import { EmptyState } from "@/app/design-system/molecules/EmptyState";
import { Segmented } from "@/app/design-system/molecules/Segmented";
import { StatCard } from "@/app/design-system/molecules/StatCard";
import { OccupancyChart } from "@/app/design-system/organisms/OccupancyChart";
import { PageHeader } from "@/app/design-system/organisms/PageHeader";
import "./pages.css";

const percent = (x: number) => `${Math.round(x * 100)}%`;

/** How full the hotel was and what came in, for this month, last month, or the last 30 days. */
export function ReportsPage() {
  const { data } = useStore();
  const { t, locale } = useAppT();
  const r = t.reportsPage;
  const [kind, setKind] = useState<PeriodKind>("thisMonth");
  const [today] = useState(todayISO);
  const report = useMemo(() => reportFor(data, periodRange(kind, today)), [data, kind, today]);
  const rp = (n: number) => formatRupiah(n, locale);
  const avg = new Intl.NumberFormat(locale === "id" ? "id-ID" : "en-GB", { maximumFractionDigits: 1 }).format(report.averageNights);

  function download() {
    const blob = new Blob(["﻿", staysCsv(data)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `pethommie-stays-${today}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <>
      <PageHeader title={r.title} lead={r.lead} />
      <Segmented<PeriodKind>
        label={r.title}
        value={kind}
        onChange={setKind}
        options={(["thisMonth", "lastMonth", "last30"] as const).map((k) => ({ value: k, label: r.periods[k] }))}
      />

      {data.cages.length === 0 ? (
        <EmptyState icon="cages" action={<Button to="/app/cages" size="sm">{t.nav.cages}</Button>}>{r.noCages}</EmptyState>
      ) : (
        <>
          <div className="pg-stats pg-stats--wide">
            <StatCard label={r.occupancy} value={percent(report.occupancy)} tone="ok" note={r.occupancyNote(report.occupiedNights, report.availableNights)} />
            <StatCard label={r.received} value={rp(report.received)} tone="brand" note={r.receivedNote} />
            <StatCard label={r.stays} value={report.stays} tone="info" note={r.staysNote(rp(report.value))} />
            <StatCard label={r.averageNights} value={report.stays ? r.nightsUnit(avg) : "–"} tone="neutral" />
            <StatCard label={r.cancelled} value={report.cancelled} tone={report.cancelled ? "warn" : "neutral"} />
            <StatCard label={r.repeat} value={report.stays ? percent(report.repeatStays / report.stays) : "–"} tone="neutral" note={report.stays ? r.repeatNote(report.repeatStays, report.stays) : undefined} />
          </div>
          <OccupancyChart daily={report.daily} cages={data.cages.length} />
          {report.stays === 0 && <Muted>{r.noStays}</Muted>}
        </>
      )}

      <section className="pg-section">
        <Heading level={2} size="md">{r.exportTitle}</Heading>
        <Muted>{r.exportNote}</Muted>
        <div>
          <Button variant="secondary" icon="download" onClick={download}>{r.exportCsv}</Button>
        </div>
      </section>
    </>
  );
}
