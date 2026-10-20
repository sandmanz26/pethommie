import { useMemo, useState } from "react";
import { formatDate, involvesPet, todayISO } from "@/app/domain/logic";
import { filterPets, NO_PET_FILTER, petStay, type PetFilter } from "@/app/domain/filters";
import type { Species } from "@/app/domain/types";
import { useStore } from "@/app/store/AppStore";
import { useAppT } from "@/app/i18n/useAppT";
import { Button } from "@/app/design-system/atoms/Button";
import { Select } from "@/app/design-system/atoms/Input";
import { EmptyState } from "@/app/design-system/molecules/EmptyState";
import { Field } from "@/app/design-system/molecules/Field";
import { FilterBar } from "@/app/design-system/molecules/FilterBar";
import { SearchField } from "@/app/design-system/molecules/SearchField";
import { Segmented } from "@/app/design-system/molecules/Segmented";
import { PageHeader } from "@/app/design-system/organisms/PageHeader";
import { PetRow } from "@/app/design-system/organisms/PetRow";
import "./pages.css";

const SPECIES: Species[] = ["cat", "dog", "rabbit", "other"];

/** Every pet, with where it is today (staying, arriving soon), filtered by stay, species and vaccine. */
export function PetsPage() {
  const { data } = useStore();
  const { t, locale } = useAppT();
  const p = t.pets;
  const [f, setF] = useState<PetFilter>(NO_PET_FILTER);
  const today = todayISO();
  const set = (patch: Partial<PetFilter>) => setF((prev) => ({ ...prev, ...patch }));

  const sorted = useMemo(() => [...data.pets].sort((a, b) => a.name.localeCompare(b.name)), [data.pets]);
  const pets = useMemo(() => filterPets(data, sorted, f, today), [data, sorted, f, today]);
  const countFor = (stay: PetFilter["stay"]) => filterPets(data, sorted, { ...f, stay }, today).length;
  const filtered = f.q !== "" || f.species !== "all" || f.vaccine !== "all" || f.stay !== "all";
  const day = (d: string) => formatDate(d, locale, { day: "numeric", month: "short" });

  return (
    <>
      <PageHeader
        art="app-pets"
        title={p.title}
        actions={
          <Button to="/app/pets/new" icon="plus">
            {p.add}
          </Button>
        }
      />
      {data.pets.length > 0 && (
        <>
          <SearchField value={f.q} onChange={(q) => set({ q })} placeholder={p.searchPh} />
          <Segmented<PetFilter["stay"]>
            label={p.show}
            value={f.stay}
            onChange={(stay) => set({ stay })}
            options={(["all", "staying", "arriving", "none"] as const).map((k) => ({ value: k, label: p.stayFilter[k], count: countFor(k) }))}
          />
          <FilterBar count={t.filters.results(pets.length)} active={filtered} onClear={() => setF(NO_PET_FILTER)} clearLabel={t.filters.clear}>
            <Field label={p.species}>
              <Select value={f.species} onChange={(e) => set({ species: e.target.value as PetFilter["species"] })}>
                <option value="all">{p.speciesAll}</option>
                {SPECIES.map((s) => (
                  <option key={s} value={s}>
                    {t.common.species[s]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={p.vaccine2}>
              <Select value={f.vaccine} onChange={(e) => set({ vaccine: e.target.value as PetFilter["vaccine"] })}>
                <option value="all">{p.vaccineFilter.all}</option>
                <option value="attention">{p.vaccineFilter.attention}</option>
              </Select>
            </Field>
          </FilterBar>
        </>
      )}
      <div className="pg-list">
        {pets.length ? (
          pets.map((pet) => {
            const stay = petStay(data, pet.id, today);
            const unit = stay.kind !== "none" ? data.cages.find((c) => c.id === stay.booking.cageId)?.name ?? "—" : "";
            return (
              <PetRow
                key={pet.id}
                pet={pet}
                owner={data.owners.find((o) => o.id === pet.ownerId)}
                stays={data.bookings.filter((b) => involvesPet(b, pet.id) && b.status !== "cancelled").length}
                today={today}
                stay={
                  stay.kind === "staying"
                    ? { tone: "ok", label: p.stayingBadge(unit, day(stay.booking.checkOut)) }
                    : stay.kind === "arriving"
                      ? { tone: "info", label: p.arrivingBadge(day(stay.booking.checkIn)) }
                      : undefined
                }
              />
            );
          })
        ) : (
          <EmptyState
            art="app-pets"
            action={
              !filtered && (
                <Button to="/app/pets/new" icon="plus" size="sm">
                  {p.add}
                </Button>
              )
            }
          >
            {filtered ? t.filters.results(0) : p.empty}
          </EmptyState>
        )}
      </div>
    </>
  );
}
