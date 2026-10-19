import { useState } from "react";
import { addDays, todayISO } from "@/app/domain/logic";
import { useStore } from "@/app/store/AppStore";
import { useAppT } from "@/app/i18n/useAppT";
import { Button } from "@/app/design-system/atoms/Button";
import { EmptyState } from "@/app/design-system/molecules/EmptyState";
import { CalendarGrid } from "@/app/design-system/organisms/CalendarGrid";
import { PageHeader } from "@/app/design-system/organisms/PageHeader";
import "./pages.css";

const DAYS = 14;

/** Two weeks of the cage calendar, with paging. */
export function CalendarPage() {
  const { data } = useStore();
  const { t } = useAppT();
  const [today] = useState(todayISO);
  const [from, setFrom] = useState(today);
  const c = t.calendar;

  return (
    <>
      <PageHeader
        title={c.title}
        lead={c.lead}
        actions={
          <>
            <Button variant="secondary" icon="minus" onClick={() => setFrom(addDays(from, -7))}>{c.earlier}</Button>
            <Button variant="secondary" disabled={from === today} onClick={() => setFrom(today)}>{c.today}</Button>
            <Button variant="secondary" icon="plus" onClick={() => setFrom(addDays(from, 7))}>{c.later}</Button>
          </>
        }
      />
      {data.cages.length ? (
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
        <EmptyState icon="cages" action={<Button to="/app/cages" size="sm">{t.nav.cages}</Button>}>{c.empty}</EmptyState>
      )}
    </>
  );
}
