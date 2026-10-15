import { useNavigate, useSearchParams } from "react-router-dom";
import { newId } from "@/app/domain/logic";
import { useStore } from "@/app/store/AppStore";
import { useAppT } from "@/app/i18n/useAppT";
import { BookingForm } from "@/app/design-system/organisms/BookingForm";
import { PageHeader } from "@/app/design-system/organisms/PageHeader";

export function BookingNewPage() {
  const { data, saveBooking, saveOwner, savePet } = useStore();
  const { t } = useAppT();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  return (
    <>
      <PageHeader title={t.bookingForm.title} back={{ to: "/app/bookings", label: t.common.back }} />
      <BookingForm
        data={data}
        initialPetId={params.get("pet") ?? undefined}
        onCancel={() => navigate(-1)}
        onSubmit={(booking, newPet) => {
          let petId = booking.petId;
          if (newPet) {
            const ownerId = saveOwner({ name: newPet.ownerName, whatsapp: newPet.whatsapp });
            petId = newId();
            savePet({ id: petId, name: newPet.name, species: newPet.species, breed: "", ownerId, vaccineExpiry: "", notes: "" });
          }
          if (saveBooking({ ...booking, petId }).length === 0) navigate("/app/bookings");
        }}
      />
    </>
  );
}
