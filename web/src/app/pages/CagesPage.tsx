import { useState } from "react";
import type { Cage, CageSize } from "../domain/types";
import { holdsCage, newId, occupantOn, SIZE_ORDER, todayISO } from "../domain/logic";
import { useStore } from "../store/AppStore";
import { useAppT } from "../i18n/useAppT";
import { Button } from "../design-system/atoms/Button";
import { Heading } from "../design-system/atoms/Text";
import { Alert } from "../design-system/molecules/Alert";
import { EmptyState } from "../design-system/molecules/EmptyState";
import { CageForm } from "../design-system/organisms/CageForm";
import { CageTile } from "../design-system/organisms/CageTile";
import { PageHeader } from "../design-system/organisms/PageHeader";
import "./pages.css";

export function CagesPage() {
  const { data, saveCage, deleteCage } = useStore();
  const { t } = useAppT();
  const [editing, setEditing] = useState<Cage | "new" | null>(null);
  const [blocked, setBlocked] = useState(false);
  const today = todayISO();

  const bySize = (s: CageSize) => data.cages.filter((c) => c.size === s).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  return (
    <>
      <PageHeader
        title={t.cages.title}
        lead={t.cages.lead}
        actions={
          <Button icon="plus" onClick={() => (setEditing("new"), setBlocked(false))}>
            {t.cages.add}
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
                    if (data.bookings.some((b) => b.cageId === editing.id && holdsCage(b))) return setBlocked(true);
                    deleteCage(editing.id);
                    setEditing(null);
                  }
                : undefined
            }
          />
        </>
      )}

      {data.cages.length === 0 && <EmptyState icon="cages">{t.cages.empty}</EmptyState>}

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
    </>
  );
}
