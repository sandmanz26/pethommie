import { useMemo, useState } from "react";
import { involvesPet, todayISO } from "@/app/domain/logic";
import { useStore } from "@/app/store/AppStore";
import { useAppT } from "@/app/i18n/useAppT";
import { Button } from "@/app/design-system/atoms/Button";
import { EmptyState } from "@/app/design-system/molecules/EmptyState";
import { SearchField } from "@/app/design-system/molecules/SearchField";
import { PageHeader } from "@/app/design-system/organisms/PageHeader";
import { PetRow } from "@/app/design-system/organisms/PetRow";
import "./pages.css";

export function PetsPage() {
  const { data } = useStore();
  const { t } = useAppT();
  const [q, setQ] = useState("");
  const today = todayISO();

  const pets = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return [...data.pets]
      .filter((p) => {
        if (!needle) return true;
        const owner = data.owners.find((o) => o.id === p.ownerId);
        return [p.name, p.breed, owner?.name, owner?.whatsapp].some((s) => s?.toLowerCase().includes(needle));
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data.pets, data.owners, q]);

  return (
    <>
      <PageHeader art="app-pets"
        title={t.pets.title}
        actions={
          <Button to="/app/pets/new" icon="plus">
            {t.pets.add}
          </Button>
        }
      />
      {data.pets.length > 0 && <SearchField value={q} onChange={setQ} placeholder={t.pets.searchPh} />}
      <div className="pg-list">
        {pets.length ? (
          pets.map((p) => (
            <PetRow
              key={p.id}
              pet={p}
              owner={data.owners.find((o) => o.id === p.ownerId)}
              stays={data.bookings.filter((b) => involvesPet(b, p.id) && b.status !== "cancelled").length}
              today={today}
            />
          ))
        ) : (
          <EmptyState
            art="app-pets"
            action={
              !q && (
                <Button to="/app/pets/new" icon="plus" size="sm">
                  {t.pets.add}
                </Button>
              )
            }
          >
            {q ? `“${q}”` : t.pets.empty}
          </EmptyState>
        )}
      </div>
    </>
  );
}
