import { useState } from "react";
import type { Booking, HotelData, Invoice, Language } from "@/app/domain/types";
import { defaultDueDate, invoiceOutdated, invoicePayment, type InvoiceIssue } from "@/app/domain/invoices";
import { formatDate, formatRupiah, todayISO } from "@/app/domain/logic";
import { Alert } from "@/app/design-system/molecules/Alert";
import { Badge, type Tone } from "@/app/design-system/atoms/Badge";
import { Button } from "@/app/design-system/atoms/Button";
import { Input, Select } from "@/app/design-system/atoms/Input";
import { Heading, Muted } from "@/app/design-system/atoms/Text";
import { Field } from "@/app/design-system/molecules/Field";
import { useAppT } from "@/app/i18n/useAppT";
import { dateError } from "@/app/forms/messages";
import "./organisms.css";

const tone: Record<string, Tone> = { unpaid: "danger", partial: "warn", paid: "ok", unknown: "neutral" };

/** The invoices of one stay, and a way to make one. Details of an invoice are on its own page. */
export function InvoicePanel({
  data,
  booking,
  onIssue,
}: {
  data: HotelData;
  booking: Booking;
  /** Returns why it couldn't be made, if it couldn't. */
  onIssue: (request: { issuedOn: string; language: Language; dueOn: string | null }) => InvoiceIssue[];
}) {
  const { t, locale } = useAppT();
  const p = t.invoicePanel;
  const mine = data.invoices.filter((i) => i.bookingId === booking.id);
  const live = mine.find((i) => i.status === "issued");
  const [language, setLanguage] = useState<Language>(() => {
    const owner = data.owners.find((o) => o.id === data.pets.find((x) => x.id === booking.petId)?.ownerId);
    return owner?.language ?? data.settings.invoiceLanguage;
  });
  const [due, setDue] = useState(() => defaultDueDate(booking, todayISO()));
  const [error, setError] = useState<string | undefined>();
  const [dueError, setDueError] = useState<string | undefined>();
  const rp = (n: number) => formatRupiah(n, locale);

  function create() {
    const bad = due ? dateError(t.validation, due) ?? (due < todayISO() ? t.validation.dateNotPast : undefined) : undefined;
    setDueError(bad);
    if (bad) return;
    const issues = onIssue({ issuedOn: todayISO(), language, dueOn: due || null });
    if (!issues.length) return setError(undefined);
    setError(issues.includes("cancelled") ? p.errCancelled : issues.includes("exists") ? p.errExists : p.errOther);
  }

  const row = (i: Invoice) => (
    <li key={i.id} className={i.status === "void" ? "is-void" : ""}>
      <span>
        <b>{i.number}</b>
        <small>
          {formatDate(i.issuedOn, locale, { day: "numeric", month: "short", year: "numeric" })} · {rp(i.total)}
        </small>
      </span>
      {i.status === "void" ? <Badge tone="neutral">{p.voided}</Badge> : invoicePayment(data, i) !== "unknown" && <Badge tone={tone[invoicePayment(data, i)]}>{p.status[invoicePayment(data, i)]}</Badge>}
      <Button to={`/app/invoices/${i.id}`} size="sm" variant="secondary" icon="invoice">
        {p.open}
      </Button>
    </li>
  );

  return (
    <section className="ds-panel" aria-labelledby="invoice-title">
      <div>
        <Heading level={2} size="md">
          <span id="invoice-title">{p.title}</span>
        </Heading>
        <Muted>{p.hint}</Muted>
      </div>
      {mine.length > 0 ? <ul className="ds-paylist ds-invlist">{mine.map(row)}</ul> : <Muted>{p.none}</Muted>}
      {live && invoiceOutdated(data, live) && <Alert tone="warn">{p.outdated}</Alert>}
      {!live && booking.status !== "cancelled" && (
        <div className="ds-form">
          <div className="ds-form__row">
            <Field label={p.language}>
              <Select value={language} onChange={(e) => setLanguage(e.target.value as Language)}>
                <option value="id">{t.settingsBiz.languages.id}</option>
                <option value="en">{t.settingsBiz.languages.en}</option>
              </Select>
            </Field>
            <Field label={p.dueOn} error={dueError}>
              <Input type="date" value={due} onChange={(e) => (setDue(e.target.value), setDueError(undefined))} />
            </Field>
          </div>
          {error && <Alert tone="danger">{error}</Alert>}
          <div className="ds-form__actions">
            <Button icon="invoice" onClick={create}>
              {p.create}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
