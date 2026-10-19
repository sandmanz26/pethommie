import { useState, type FormEvent } from "react";
import type { CareEntry, CareKind, ISODate } from "@/app/domain/types";
import { CARE_KINDS, CARE_PRESETS, NEEDS_NOTE, type CareIssue } from "@/app/domain/careLog";
import { CARE_EMOJI } from "@/app/domain/messages";
import { formatDate, stayDay, timeOf } from "@/app/domain/logic";
import { Button } from "@/app/design-system/atoms/Button";
import { Input } from "@/app/design-system/atoms/Input";
import { Heading, Muted } from "@/app/design-system/atoms/Text";
import { Field } from "@/app/design-system/molecules/Field";
import { useAppT } from "@/app/i18n/useAppT";
import "./organisms.css";

const pad = (n: number) => String(n).padStart(2, "0");
const clock = (d = new Date()) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** "2026-10-19" + "08:30" as an ISO date-time in the browser's time zone. */
function at(date: ISODate, time: string | null): string {
  if (!time) return new Date().toISOString();
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm).toISOString();
}

/**
 * The daily care log. Pick what you did; for meals, water, play, toilet and mood the answer is one more tap
 * and it is saved with the time. Medicine, notes and incidents need a few words.
 */
export function CareLogPanel({
  today,
  entries,
  earlier,
  checkIn,
  active,
  onAdd,
  onRemove,
}: {
  today: ISODate;
  /** Today's entries, earliest first. */
  entries: CareEntry[];
  /** Past days of this stay, newest first. */
  earlier: { date: ISODate; entries: CareEntry[] }[];
  checkIn: ISODate;
  /** The pet is checked in, so the log accepts entries. */
  active: boolean;
  onAdd: (entry: Pick<CareEntry, "kind" | "preset" | "note" | "at">) => CareIssue[];
  onRemove: (id: string) => void;
}) {
  const { t, locale } = useAppT();
  const c = t.care;
  const [kind, setKind] = useState<CareKind>("meal");
  const [time, setTime] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | undefined>();
  const presets = CARE_PRESETS[kind];
  const needsNote = NEEDS_NOTE.includes(kind);

  function add(preset: string | null) {
    const issues = onAdd({ kind, preset, note, at: at(today, time) });
    if (issues.length) return setError(c.errNote);
    setNote("");
    setTime(null);
    setError(undefined);
  }

  const label = (e: CareEntry) =>
    [e.preset ? c.presets[e.kind]?.[e.preset] : "", e.note].filter(Boolean).join(" · ");

  return (
    <section className="ds-panel" aria-labelledby="care-title">
      <div>
        <Heading level={2} size="md">
          <span id="care-title">{c.title}</span>
        </Heading>
        <Muted>{active ? c.lead : c.closed}</Muted>
      </div>

      {active && (
        <div className="ds-care">
          <div className="ds-chips" role="group" aria-label={c.title}>
            {CARE_KINDS.map((k) => (
              <button key={k} type="button" className="ds-chip" aria-pressed={k === kind} onClick={() => (setKind(k), setError(undefined))}>
                <span aria-hidden>{CARE_EMOJI[k]}</span> {c.kinds[k]}
              </button>
            ))}
          </div>
          <div className="ds-care__entry">
            <Field label={c.time}>
              <Input type="time" value={time ?? clock()} onChange={(e) => setTime(e.target.value)} />
            </Field>
            <Field label={c.details} error={error} optional={needsNote ? undefined : t.common.optional}>
              <Input value={note} onChange={(e) => (setNote(e.target.value), setError(undefined))} placeholder={c.detailsPh} />
            </Field>
          </div>
          {presets.length > 0 ? (
            <div className="ds-chips" role="group" aria-label={c.kinds[kind]}>
              {presets.map((p) => (
                <button key={p} type="button" className="ds-chip ds-chip--answer" onClick={() => add(p)}>
                  {c.presets[kind][p]}
                </button>
              ))}
            </div>
          ) : (
            <form onSubmit={(e: FormEvent) => (e.preventDefault(), add(null))}>
              <Button type="submit" icon="plus">
                {c.add}
              </Button>
            </form>
          )}
        </div>
      )}

      <Heading level={3} size="sm">
        {c.day(stayDay(checkIn, today), c.today)}
      </Heading>
      {entries.length ? (
        <ul className="ds-timeline">
          {entries.map((e) => (
            <li key={e.id} className={e.kind === "incident" ? "is-incident" : ""}>
              <time dateTime={e.at}>{timeOf(e.at, locale)}</time>
              <span>
                <span aria-hidden>{CARE_EMOJI[e.kind]}</span> <b>{c.kinds[e.kind]}</b>
                {label(e) && `: ${label(e)}`}
              </span>
              <Button variant="ghost" size="sm" icon="trash" aria-label={`${c.delete}: ${c.kinds[e.kind]} ${timeOf(e.at, locale)}`} onClick={() => onRemove(e.id)} />
            </li>
          ))}
        </ul>
      ) : (
        <Muted>{c.empty}</Muted>
      )}

      {earlier.map((d) => (
        <details key={d.date} className="ds-earlier">
          <summary>{c.day(stayDay(checkIn, d.date), formatDate(d.date, locale, { day: "numeric", month: "short" }))}</summary>
          <ul className="ds-timeline">
            {d.entries.map((e) => (
              <li key={e.id} className={e.kind === "incident" ? "is-incident" : ""}>
                <time dateTime={e.at}>{timeOf(e.at, locale)}</time>
                <span>
                  <span aria-hidden>{CARE_EMOJI[e.kind]}</span> <b>{c.kinds[e.kind]}</b>
                  {label(e) && `: ${label(e)}`}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </section>
  );
}
