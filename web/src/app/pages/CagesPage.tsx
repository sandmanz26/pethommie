import { useState } from "react";
import type { Cage, CageSize, Pet } from "@/app/domain/types";
import { hasNoUnits, holdsCage, isShared, newId, occupantOn, placesUsed, SIZE_ORDER, stayPetIds, todayISO } from "@/app/domain/logic";
import { useStore } from "@/app/store/AppStore";
import { useAppT } from "@/app/i18n/useAppT";
import { Button } from "@/app/design-system/atoms/Button";
import { Heading } from "@/app/design-system/atoms/Text";
import { Alert } from "@/app/design-system/molecules/Alert";
import { EmptyState } from "@/app/design-system/molecules/EmptyState";
import { CageForm } from "@/app/design-system/organisms/CageForm";
import { CageTile } from "@/app/design-system/organisms/CageTile";
import { PageHeader } from "@/app/design-system/organisms/PageHeader";
import { CapacityPage } from "./CapacityPage";
import "./pages.css";
import { useUnitWords } from "@/app/i18n/useUnitWords";

export function CagesPage() {
  const { data, saveCage, deleteCage, restoreCage } = useStore();
  const { t } = useAppT();
  const units = useUnitWords();
  const [editing, setEditing] = useState<Cage | "new" | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [archivedName, setArchivedName] = useState<string | null>(null);
  const today = todayISO();

  const bySize = (s: CageSize) => data.cages.filter((c) => c.size === s && !isShared(c) && !c.archived).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  const rooms = data.cages.filter((c) => isShared(c) && !c.archived);
  const archived = data.cages.filter((c) => c.archived);
  const guestsTonight = (cageId: string) =>
    data.bookings.filter((b) => b.cageId === cageId && holdsCage(b) && b.checkIn <= today && today < b.checkOut).flatMap((b) => stayPetIds(b).map((id) => data.pets.find((p) => p.id === id)).filter((p): p is Pet => Boolean(p)));

  // No cages or rooms: this menu is the hotel's capacity and price per pet instead.
  if (hasNoUnits(data)) return <CapacityPage />;

  return (
    <>
      <PageHeader art="app-cage"
        title={units.many}
        lead={t.cages.lead}
        actions={
          <Button icon="plus" onClick={() => (setEditing("new"), setBlocked(false))}>
            {units.add}
          </Button>
        }
      />

      {editing && (
        <>
          {blocked && <Alert tone="danger">{t.cages.cantDelete}</Alert>}
          <CageForm
            key={editing === "new" ? "new" : editing.id}
            cage={editing === "new" ? undefined : editing}
            onCancel={() => setEditing(null)}
            onSubmit={(draft) => {
              saveCage({ ...draft, id: editing === "new" ? newId() : editing.id });
              setEditing(null);
            }}
            onDelete={
              editing !== "new"
                ? () => {
                    const result = deleteCage(editing.id);
                    if (result === "busy") return setBlocked(true);
                    setArchivedName(result === "archived" ? editing.name : null);
                    setEditing(null);
                  }
                : undefined
            }
          />
        </>
      )}

      {archivedName && <Alert tone="info">{t.cages.archivedNote(archivedName)}</Alert>}
      {data.cages.length === 0 && <EmptyState art="app-cage">{t.cages.empty}</EmptyState>}

      {rooms.length > 0 && (
        <section className="pg-section">
          <Heading level={2} size="md">
            {t.cages.sharedRooms} · {rooms.length}
          </Heading>
          <div className="pg-cagegrid">
            {rooms.map((c) => (
              <CageTile key={c.id} cage={c} guests={guestsTonight(c.id)} used={placesUsed(data, c.id, today)} onEdit={() => (setEditing(c), setBlocked(false), window.scrollTo({ top: 0, behavior: "smooth" }))} />
            ))}
          </div>
        </section>
      )}

      {SIZE_ORDER.map((s) => {
        const cages = bySize(s);
        if (!cages.length) return null;
        return (
          <section className="pg-section" key={s}>
            <Heading level={2} size="md">
              {t.common.sizes[s]} · {cages.length}
            </Heading>
            <div className="pg-cagegrid">
              {cages.map((c) => {
                const b = occupantOn(data, c.id, today);
                return (
                  <CageTile
                    key={c.id}
                    cage={c}
                    occupant={b ? data.pets.find((p) => p.id === b.petId) : undefined}
                    onEdit={() => (setEditing(c), setBlocked(false), window.scrollTo({ top: 0, behavior: "smooth" }))}
                  />
                );
              })}
            </div>
          </section>
        );
      })}
      {archived.length > 0 && (
        <section className="pg-section" aria-label={t.cages.archivedTitle}>
          <Heading level={2} size="md">
            {t.cages.archivedTitle} · {archived.length}
          </Heading>
          <ul className="pg-archived">
            {archived.map((c) => (
              <li key={c.id}>
                <span>{c.name}</span>
                <Button size="sm" variant="secondary" onClick={() => (restoreCage(c.id), setArchivedName(null))}>
                  {t.cages.restore}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
