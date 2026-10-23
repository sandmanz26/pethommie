import { useState } from "react";
import type { ISODate } from "@/app/domain/types";
import { hasNoUnits, todayISO } from "@/app/domain/logic";
import { calendarRange, rangeTitle, shiftAnchor, type CalendarView } from "@/app/domain/calendar";
import { useStore } from "@/app/store/AppStore";
import { useAppT } from "@/app/i18n/useAppT";
import { Button } from "@/app/design-system/atoms/Button";
import { EmptyState } from "@/app/design-system/molecules/EmptyState";
import { Segmented } from "@/app/design-system/molecules/Segmented";
import { CalendarDayDrawer } from "@/app/design-system/organisms/CalendarDayDrawer";
import { CalendarGrid } from "@/app/design-system/organisms/CalendarGrid";
import { PoolCalendar } from "@/app/design-system/organisms/PoolCalendar";
import { PageHeader } from "@/app/design-system/organisms/PageHeader";
import "./pages.css";
import { useUnitWords } from "@/app/i18n/useUnitWords";

const VIEW_KEY = "pethommie.calendar.view";

function savedView(): CalendarView {
  try {
    return localStorage.getItem(VIEW_KEY) === "month" ? "month" : "week";
  } catch {
    return "week";
  }
}

/** The calendar by week (Monday to Sunday) or by month, with paging; a day or a stay opens that day in a drawer. */
export function CalendarPage() {
  const { data } = useStore();
  const { t, locale } = useAppT();
  const [today] = useState(todayISO);
  const [view, setView] = useState<CalendarView>(savedView);
  const [anchor, setAnchor] = useState<ISODate>(today);
  const [open, setOpen] = useState<{ cageId: string | null; date: ISODate } | null>(null);
  const c = t.calendar;
  const units = useUnitWords();
  const noUnits = hasNoUnits(data);
  const { from, days } = calendarRange(view, anchor);
  const showsToday = calendarRange(view, today).from === from;

  const pick = (v: CalendarView) => {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* private mode: the view just isn't remembered */
    }
  };

  const toolbar = (
    <div className="ds-calbar">
      <Segmented label={c.view} value={view} onChange={pick} options={[{ value: "week", label: c.week }, { value: "month", label: c.month }]} />
      <div className="ds-calbar__nav">
        <Button variant="secondary" size="sm" icon="chevronLeft" aria-label={c.prev[view]} onClick={() => setAnchor(shiftAnchor(view, anchor, -1))} />
        <Button variant="secondary" size="sm" disabled={showsToday} onClick={() => setAnchor(today)}>
          {c.today}
        </Button>
        <Button variant="secondary" size="sm" icon="chevronRight" aria-label={c.next[view]} onClick={() => setAnchor(shiftAnchor(view, anchor, 1))} />
      </div>
      <h2 className="ds-calbar__title" aria-live="polite">
        {rangeTitle(view, from, days, locale)}
      </h2>
    </div>
  );

  return (
    <>
      <PageHeader art="app-cages" title={units.calendar} lead={noUnits ? t.pool.calendarLead : c.lead} />
      {noUnits && data.cages.length ? (
        <>
          {toolbar}
          <PoolCalendar data={data} view={view} from={from} days={days} onOpenDay={(date) => setOpen({ cageId: null, date })} />
        </>
      ) : data.cages.length ? (
        <>
          {toolbar}
          <CalendarGrid data={data} from={from} days={days} onOpenDay={(cageId, date) => setOpen({ cageId, date })} />
          <ul className="ds-legend" aria-label="Legend">
            {(["booked", "checked_in", "checked_out"] as const).map((s) => (
              <li key={s}>
                <i style={{ background: s === "booked" ? "var(--info)" : s === "checked_in" ? "var(--ok)" : "var(--ink-faint)" }} />
                {c.legend[s]}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <EmptyState art="app-cage" action={<Button to="/app/cages" size="sm">{t.nav.cages}</Button>}>{c.empty}</EmptyState>
      )}
      {open && <CalendarDayDrawer data={data} cageId={open.cageId} date={open.date} onClose={() => setOpen(null)} />}
    </>
  );
}
