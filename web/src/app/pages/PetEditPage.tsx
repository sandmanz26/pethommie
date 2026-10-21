import { useState } from "react";
import { petHasHistory } from "@/app/domain/bookingRules";
import { Muted } from "@/app/design-system/atoms/Text";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { newId } from "@/app/domain/logic";
import { useStore } from "@/app/store/AppStore";
import { useAppT } from "@/app/i18n/useAppT";
import { Button } from "@/app/design-system/atoms/Button";
import { ConfirmDialog } from "@/app/design-system/molecules/ConfirmDialog";
import { PageHeader } from "@/app/design-system/organisms/PageHeader";
import { PetForm } from "@/app/design-system/organisms/PetForm";

/** Handles both /app/pets/new and /app/pets/:id. */
export function PetEditPage() {
  const { id } = useParams();
  const { data, savePet, saveOwner, deletePet } = useStore();
  const { t } = useAppT();
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const pet = id ? data.pets.find((p) => p.id === id) : undefined;
  if (id && !pet) return <Navigate to="/app/pets" replace />;
  const owner = pet ? data.owners.find((o) => o.id === pet.ownerId) : undefined;

  return (
    <>
      <PageHeader
        title={pet ? `${t.petForm.editTitle}: ${pet.name}` : t.petForm.newTitle}
        back={{ to: "/app/pets", label: t.common.back }}
        actions={
          pet && (
            <Button to={`/app/bookings/new?pet=${pet.id}`} variant="secondary" icon="bookings">
              {t.nav.newBooking}
            </Button>
          )
        }
      />
      {pet && petHasHistory(data, pet.id) && <Muted>{t.petForm.keptNote}</Muted>}
      <PetForm
        pet={pet}
        owner={owner}
        submitLabel={t.petForm.save}
        onCancel={() => navigate("/app/pets")}
        extraActions={
          pet &&
          !petHasHistory(data, pet.id) && (
            <Button variant="danger" icon="trash" onClick={() => setConfirmDelete(true)}>
              {t.common.delete}
            </Button>
          )
        }
        onSubmit={(draft, ownerDraft) => {
          // Keep the same owner record when editing; otherwise match by WhatsApp or create one.
          const ownerId = saveOwner({ ...ownerDraft, id: owner && (!ownerDraft.whatsapp || ownerDraft.whatsapp === owner.whatsapp) ? owner.id : undefined });
          savePet({ ...draft, id: pet?.id ?? newId(), ownerId });
          navigate("/app/pets");
        }}
      />
      <ConfirmDialog
        open={confirmDelete}
        message={t.petForm.confirmDelete}
        confirmLabel={t.common.delete}
        cancelLabel={t.common.cancel}
        danger
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          if (pet) deletePet(pet.id);
          navigate("/app/pets");
        }}
      />
    </>
  );
}
