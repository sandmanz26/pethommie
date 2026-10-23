import { useState } from "react";
import { addDays, hasNoUnits, todayISO } from "@/app/domain/logic";
import { useStore } from "@/app/store/AppStore";
import { useAppT } from "@/app/i18n/useAppT";
import { Button } from "@/app/design-system/atoms/Button";
import { EmptyState } from "@/app/design-system/molecules/EmptyState";
import { CalendarGrid } from "@/app/design-system/organisms/CalendarGrid";
import { PoolCalendar } from "@/app/design-system/organisms/PoolCalendar";
import { PageHeader } from "@/app/design-system/organisms/PageHeader";
import "./pages.css";
import { useUnitWords } from "@/app/i18n/useUnitWords";

const DAYS = 14;

/** Two weeks of the cage calendar, with paging. */
export function CalendarPage() {
  const { data } = useStore();
  const { t } = useAppT();
  const [today] = useState(todayISO);
  const [from, setFrom] = useState(today);
  const c = t.calendar;
  const units = useUnitWords();
  const noUnits = hasNoUnits(data);

  return (
    <>
      <PageHeader art="app-cages"
        title={units.calendar}
        lead={noUnits ? t.pool.calendarLead : c.lead}
        actions={
          <>
            <Button variant="secondary" icon="minus" onClick={() => setFrom(addDays(from, -7))}>{c.earlier}</Button>
            <Button variant="secondary" disabled={from === today} onClick={() => setFrom(today)}>{c.today}</Button>
            <Button variant="secondary" icon="plus" onClick={() => setFrom(addDays(from, 7))}>{c.later}</Button>
          </>
        }
      />
      {noUnits && data.cages.length ? (
        <PoolCalendar data={data} from={from} days={DAYS} />
      ) : data.cages.length ? (
        <>
          <CalendarGrid data={data} from={from} days={DAYS} />
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
    </>
  );
}
