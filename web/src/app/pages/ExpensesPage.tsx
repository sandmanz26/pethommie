import { useMemo, useState, type FormEvent } from "react";
import { byCategory, DIRECT_COSTS, EXPENSE_CATEGORIES, expensesCsv, expensesIn, isDirect, NO_EXPENSE_FILTER, recurringToCopy, sumOf, type ExpenseFilter } from "@/app/domain/finance";
import { formatDate, formatRupiah, newId, todayISO } from "@/app/domain/logic";
import type { Expense, ExpenseCategory, PaymentMethod } from "@/app/domain/types";
import { useStore } from "@/app/store/AppStore";
import { useAppT } from "@/app/i18n/useAppT";
import { Badge } from "@/app/design-system/atoms/Badge";
import { Button } from "@/app/design-system/atoms/Button";
import { Checkbox } from "@/app/design-system/atoms/Checkbox";
import { Input, Select } from "@/app/design-system/atoms/Input";
import { Alert } from "@/app/design-system/molecules/Alert";
import { ConfirmDialog } from "@/app/design-system/molecules/ConfirmDialog";
import { EmptyState } from "@/app/design-system/molecules/EmptyState";
import { Field } from "@/app/design-system/molecules/Field";
import { SearchField } from "@/app/design-system/molecules/SearchField";
import { StatCard } from "@/app/design-system/molecules/StatCard";
import { BarList } from "@/app/design-system/organisms/BarList";
import { PageHeader } from "@/app/design-system/organisms/PageHeader";
import { downloadCsv } from "./trend";
import { compact, dateError, moneyError, textError } from "@/app/forms/messages";
import { useFocusInvalid } from "@/shared/hooks/useFocusInvalid";
import { LIMITS, parseRupiah } from "@/shared/lib/validate";
import "./pages.css";

const METHODS: PaymentMethod[] = ["transfer", "cash", "qris", "ewallet", "card"];
type Draft = { id: string | null; date: string; category: ExpenseCategory; amount: string; method: PaymentMethod; vendor: string; note: string; recurring: boolean };
const blank = (date: string): Draft => ({ id: null, date, category: "food", amount: "", method: "transfer", vendor: "", note: "", recurring: false });

/** What the hotel spends, month by month: record, correct, repeat the monthly ones, and see where it goes. */
export function ExpensesPage() {
  const { data, saveExpense, addExpenses, removeExpense } = useStore();
  const { t, locale } = useAppT();
  const x = t.expensesPage;
  const cat = t.expenseCategories;
  const [today] = useState(todayISO);
  const [month, setMonth] = useState(() => today.slice(0, 7));
  const [f, setF] = useState<ExpenseFilter>(NO_EXPENSE_FILTER);
  const [draft, setDraft] = useState<Draft>(() => blank(today));
  const [errors, setErrors] = useState<{ amount?: string; date?: string; vendor?: string; note?: string }>({});
  const v = t.validation;
  const { ref, focusInvalid } = useFocusInvalid();
  const [notice, setNotice] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Expense | null>(null);

  const all = useMemo(() => expensesIn(data, month), [data, month]);
  const list = useMemo(() => expensesIn(data, month, f), [data, month, f]);
  const toCopy = useMemo(() => recurringToCopy(data, month), [data, month]);
  const totals = byCategory(all);
  const total = sumOf(all);
  const direct = DIRECT_COSTS.reduce((s, c) => s + totals[c], 0);
  const rp = (n: number) => formatRupiah(n, locale);
  const set = (patch: Partial<Draft>) => (setDraft((d) => ({ ...d, ...patch })), setErrors((x) => ({ ...x, ...Object.fromEntries(Object.keys(patch).map((k) => [k, undefined])) })));

  function submit(e: FormEvent) {
    e.preventDefault();
    const local = compact({
      date: dateError(v, draft.date),
      amount: moneyError(v, locale, draft.amount, { required: true, zero: x.errAmount }),
      vendor: textError(v, draft.vendor, { max: LIMITS.short }),
      note: textError(v, draft.note, { max: LIMITS.line }),
    });
    if (Object.keys(local).length) return void (setErrors(local), focusInvalid());
    const amount = parseRupiah(draft.amount) ?? 0;
    const issues = saveExpense({ id: draft.id ?? newId(), date: draft.date, category: draft.category, amount, method: draft.method, vendor: draft.vendor.trim(), note: draft.note.trim(), recurring: draft.recurring });
    setErrors({ amount: issues.includes("amount") ? x.errAmount : undefined, date: issues.includes("date") ? x.errDate : undefined });
    if (issues.length) return void focusInvalid();
    setNotice(x.saved);
    if (draft.date.slice(0, 7) !== month) setMonth(draft.date.slice(0, 7));
    setDraft({ ...blank(draft.date), method: draft.method });
  }

  function edit(e: Expense) {
    setDraft({ id: e.id, date: e.date, category: e.category, amount: String(e.amount), method: e.method, vendor: e.vendor, note: e.note, recurring: e.recurring });
    setErrors({});
    setNotice(null);
    document.getElementById("expense-form")?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      <PageHeader
        art="feature-payments"
        title={x.title}
        lead={x.lead}
        actions={
          <Button to="/app/finance" variant="secondary" icon="chart">
            {x.toFinance}
          </Button>
        }
      />

      <div className="pg-toolbar">
        <Field label={x.month}>
          <Input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
        </Field>
        <Field label={x.category}>
          <Select value={f.category} onChange={(e) => setF((p) => ({ ...p, category: e.target.value as ExpenseFilter["category"] }))}>
            <option value="all">{x.allCategories}</option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {cat[c]}
              </option>
            ))}
          </Select>
        </Field>
        {toCopy.length > 0 && (
          <Button
            variant="secondary"
            icon="plus"
            onClick={() => {
              const n = addExpenses(toCopy);
              setNotice(x.copied(n));
            }}
          >
            {x.copyRecurring(toCopy.length)}
          </Button>
        )}
      </div>
      {notice && <Alert tone="ok">{notice}</Alert>}

      <div className="pg-stats pg-stats--wide">
        <StatCard label={x.total} value={rp(total)} tone="brand" note={x.count(all.length)} />
        <StatCard label={x.direct} value={rp(direct)} tone="warn" note={x.directNote} />
        <StatCard label={x.operating} value={rp(total - direct)} tone="info" note={x.operatingNote} />
      </div>

      <div className="pg-columns">
        <form ref={ref} className="ds-form__section pg-panel" id="expense-form" onSubmit={submit} noValidate aria-label={draft.id ? x.edit : x.add}>
          <h2 className="pg-panel__title">{draft.id ? x.edit : x.add}</h2>
          <div className="ds-form__row">
            <Field label={x.date} error={errors.date}>
              <Input type="date" value={draft.date} onChange={(e) => set({ date: e.target.value })} />
            </Field>
            <Field label={x.amount} error={errors.amount}>
              <Input value={draft.amount} onChange={(e) => set({ amount: e.target.value })} inputMode="numeric" placeholder="0" />
            </Field>
          </div>
          <div className="ds-form__row">
            <Field label={x.category}>
              <Select value={draft.category} onChange={(e) => set({ category: e.target.value as ExpenseCategory })}>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {cat[c]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={x.method}>
              <Select value={draft.method} onChange={(e) => set({ method: e.target.value as PaymentMethod })}>
                {METHODS.map((m) => (
                  <option key={m} value={m}>
                    {t.payments.methods[m]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label={x.vendor} error={errors.vendor} optional={t.common.optional}>
            <Input value={draft.vendor} onChange={(e) => set({ vendor: e.target.value })} placeholder={x.vendorPh} />
          </Field>
          <Field label={x.note} error={errors.note} optional={t.common.optional}>
            <Input value={draft.note} onChange={(e) => set({ note: e.target.value })} placeholder={x.notePh} />
          </Field>
          <Checkbox label={x.recurring} checked={draft.recurring} onChange={(e) => set({ recurring: e.target.checked })} />
          <div className="ds-form__actions">
            {draft.id && (
              <Button variant="ghost" onClick={() => setDraft(blank(today))}>
                {t.common.cancel}
              </Button>
            )}
            <Button type="submit" icon="check">
              {x.save}
            </Button>
          </div>
        </form>

        <BarList
          title={x.byCategory}
          tone="brand"
          empty={x.empty}
          rows={EXPENSE_CATEGORIES.filter((c) => totals[c] > 0)
            .sort((a, b) => totals[b] - totals[a])
            .map((c) => ({ key: c, label: cat[c], value: totals[c], display: rp(totals[c]), note: isDirect(c) ? x.direct : x.operating }))}
        />
      </div>

      <SearchField value={f.q} onChange={(q) => setF((p) => ({ ...p, q }))} placeholder={x.search} />
      {list.length ? (
        <div className="pg-tablewrap" role="region" tabIndex={0} aria-label={x.title}>
          <table className="pg-table">
            <caption className="ds-sr">{x.title}</caption>
            <thead>
              <tr>
                <th scope="col">{x.columns.date}</th>
                <th scope="col">{x.columns.category}</th>
                <th scope="col">{x.columns.paidTo}</th>
                <th scope="col">{x.columns.method}</th>
                <th scope="col" className="num">{x.columns.amount}</th>
                <th scope="col">
                  <span className="ds-sr">{t.common.edit}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((e) => (
                <tr key={e.id}>
                  <td>{formatDate(e.date, locale, { day: "numeric", month: "short" })}</td>
                  <td>
                    {cat[e.category]} {e.recurring && <Badge tone="info">{x.recurringBadge}</Badge>}
                  </td>
                  <td>
                    {e.vendor || "—"}
                    {e.note && <small className="pg-table__sub">{e.note}</small>}
                  </td>
                  <td>{t.payments.methods[e.method]}</td>
                  <td className="num">{rp(e.amount)}</td>
                  <td className="num">
                    <Button variant="ghost" size="sm" icon="edit" aria-label={`${t.common.edit} ${cat[e.category]} ${rp(e.amount)}`} onClick={() => edit(e)} />
                    <Button variant="ghost" size="sm" icon="trash" aria-label={`${x.remove} ${cat[e.category]} ${rp(e.amount)}`} onClick={() => setRemoving(e)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState art="feature-payments">{all.length ? x.emptyFilter : x.empty}</EmptyState>
      )}
      <div>
        <Button variant="secondary" icon="download" disabled={!list.length} onClick={() => downloadCsv(`pethommie-expenses-${month}.csv`, expensesCsv(list))}>
          {x.exportCsv}
        </Button>
      </div>

      <ConfirmDialog
        open={removing !== null}
        message={x.removeConfirm}
        confirmLabel={x.remove}
        cancelLabel={t.common.cancel}
        danger
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          if (removing) removeExpense(removing.id);
          setRemoving(null);
        }}
      />
    </>
  );
}
