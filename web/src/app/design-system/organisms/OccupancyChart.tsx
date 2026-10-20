import type { Report } from "@/app/domain/reports";
import { formatDate } from "@/app/domain/logic";
import { useAppT } from "@/app/i18n/useAppT";
import "./organisms.css";

/** One bar per day: how many of the cages had a pet. Each bar says its numbers, for a screen reader or a tooltip. */
export function OccupancyChart({ daily, cages }: { daily: Report["daily"]; cages: number }) {
  const { t, locale } = useAppT();
  const r = t.reportsPage;
  return (
    <figure className="ds-chart">
      <figcaption>{r.chartTitle}</figcaption>
      <div className="ds-chart__bars" role="list">
        {daily.map((d) => {
          const label = r.chartLabel(formatDate(d.date, locale, { day: "numeric", month: "short" }), d.occupied, cages);
          return (
            <span key={d.date} className="ds-chart__bar" role="listitem" title={label} aria-label={label}>
              <i style={{ height: `${cages ? Math.round((d.occupied / cages) * 100) : 0}%` }} />
            </span>
          );
        })}
      </div>
      <div className="ds-chart__axis" aria-hidden="true">
        <span>{daily[0] && formatDate(daily[0].date, locale, { day: "numeric", month: "short" })}</span>
        <span>{daily.length > 1 && formatDate(daily[daily.length - 1].date, locale, { day: "numeric", month: "short" })}</span>
      </div>
    </figure>
  );
}
