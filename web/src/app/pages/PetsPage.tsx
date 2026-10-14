import { useMemo, useState } from "react";
import { todayISO } from "../domain/logic";
import { useStore } from "../store/AppStore";
import { useAppT } from "../i18n/useAppT";
import { Button } from "../design-system/atoms/Button";
import { EmptyState } from "../design-system/molecules/EmptyState";
import { SearchField } from "../design-system/molecules/SearchField";
import { PageHeader } from "../design-system/organisms/PageHeader";
import { PetRow } from "../design-system/organisms/PetRow";
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
      <PageHeader
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
              stays={data.bookings.filter((b) => b.petId === p.id && b.status !== "cancelled").length}
              today={today}
            />
          ))
        ) : (
          <EmptyState
            icon="pets"
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
