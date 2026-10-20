import { useMemo, useState } from "react";
import { customers, matchesCustomer } from "@/app/domain/customers";
import { inSegment, sortCustomers, type CustomerSegment, type CustomerSort } from "@/app/domain/filters";
import { todayISO } from "@/app/domain/logic";
import { useStore } from "@/app/store/AppStore";
import { useAppT } from "@/app/i18n/useAppT";
import { Select } from "@/app/design-system/atoms/Input";
import { EmptyState } from "@/app/design-system/molecules/EmptyState";
import { Field } from "@/app/design-system/molecules/Field";
import { SearchField } from "@/app/design-system/molecules/SearchField";
import { Segmented } from "@/app/design-system/molecules/Segmented";
import { CustomerRow } from "@/app/design-system/organisms/CustomerRow";
import { PageHeader } from "@/app/design-system/organisms/PageHeader";
import "./pages.css";

const SEGMENTS: CustomerSegment[] = ["all", "owes", "regular", "new", "inactive"];

/** Everyone who has brought a pet, with their stays and what they owe: by segment, sorted as needed. */
export function CustomersPage() {
  const { data } = useStore();
  const { t } = useAppT();
  const c = t.customersPage;
  const [q, setQ] = useState("");
  const [segment, setSegment] = useState<CustomerSegment>("all");
  const [sort, setSort] = useState<CustomerSort>("recent");
  const today = todayISO();
  const all = useMemo(() => customers(data), [data]);
  const searched = all.filter((x) => matchesCustomer(x, q));
  const shown = sortCustomers(
    searched.filter((x) => inSegment(x, segment, today)),
    sort,
  );
  return (
    <>
      <PageHeader art="app-guests" title={c.title} lead={c.lead} />
      {all.length > 0 && (
        <>
          <SearchField value={q} onChange={setQ} placeholder={c.search} />
          <Segmented<CustomerSegment>
            label={c.title}
            value={segment}
            onChange={setSegment}
            options={SEGMENTS.map((s) => ({ value: s, label: c.segments[s], count: searched.filter((x) => inSegment(x, s, today)).length }))}
          />
          <div className="pg-toolbar">
            <Field label={c.sort}>
              <Select value={sort} onChange={(e) => setSort(e.target.value as CustomerSort)}>
                {(["recent", "spent", "owed", "name"] as const).map((s) => (
                  <option key={s} value={s}>
                    {c.sorts[s]}
                  </option>
                ))}
              </Select>
            </Field>
            <span className="pg-toolbar__count">{t.filters.results(shown.length)}</span>
          </div>
        </>
      )}
      <div className="pg-list">
        {shown.length ? (
          shown.map((x) => <CustomerRow key={x.owner.id} customer={x} />)
        ) : (
          <EmptyState art="app-guests">{q ? c.noMatch(q) : all.length ? t.filters.results(0) : c.empty}</EmptyState>
        )}
      </div>
    </>
  );
}
