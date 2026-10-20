import { useMemo, useState } from "react";
import { customers, matchesCustomer } from "@/app/domain/customers";
import { useStore } from "@/app/store/AppStore";
import { useAppT } from "@/app/i18n/useAppT";
import { EmptyState } from "@/app/design-system/molecules/EmptyState";
import { SearchField } from "@/app/design-system/molecules/SearchField";
import { CustomerRow } from "@/app/design-system/organisms/CustomerRow";
import { PageHeader } from "@/app/design-system/organisms/PageHeader";
import "./pages.css";

/** Everyone who has brought a pet, with their stays and what they owe. */
export function CustomersPage() {
  const { data } = useStore();
  const { t } = useAppT();
  const [q, setQ] = useState("");
  const all = useMemo(() => customers(data), [data]);
  const shown = all.filter((c) => matchesCustomer(c, q));
  return (
    <>
      <PageHeader title={t.customersPage.title} lead={t.customersPage.lead} />
      {all.length > 0 && <SearchField value={q} onChange={setQ} placeholder={t.customersPage.search} />}
      <div className="pg-list">
        {shown.length ? (
          shown.map((c) => <CustomerRow key={c.owner.id} customer={c} />)
        ) : (
          <EmptyState icon="pets">{q ? t.customersPage.noMatch(q) : t.customersPage.empty}</EmptyState>
        )}
      </div>
    </>
  );
}
