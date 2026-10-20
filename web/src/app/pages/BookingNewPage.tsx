import { useNavigate, useSearchParams } from "react-router-dom";
import { newId } from "@/app/domain/logic";
import { normaliseWhatsapp } from "@/shared/lib/phone";
import { useMode } from "@/app/mode/ModeProvider";
import { useStore } from "@/app/store/AppStore";
import { useAppT } from "@/app/i18n/useAppT";
import { BookingForm } from "@/app/design-system/organisms/BookingForm";
import { PageHeader } from "@/app/design-system/organisms/PageHeader";

export function BookingNewPage() {
  const { data, saveBooking, saveOwner, savePet } = useStore();
  const { t } = useAppT();
  const { advanced } = useMode();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  return (
    <>
      <PageHeader title={t.bookingForm.title} back={{ to: "/app/bookings", label: t.common.back }} />
      <BookingForm
        data={data}
        simple={!advanced}
        initialPetId={params.get("pet") ?? undefined}
        initialCageId={params.get("cage") ?? undefined}
        initialCheckIn={params.get("in") ?? undefined}
        initialCheckOut={params.get("out") ?? undefined}
        onCancel={() => navigate(-1)}
        onSubmit={(booking, guest) => {
          // A new owner and a new pet are saved first, so the stay can point at them.
          const ownerId = guest.ownerId ?? saveOwner({ name: guest.newOwner!.name.trim(), whatsapp: normaliseWhatsapp(guest.newOwner!.whatsapp) ?? "" });
          let { petId, companionIds } = booking;
          if (guest.newPet) {
            const id = newId();
            savePet({ id, name: guest.newPet.name.trim(), species: guest.newPet.species, breed: "", ownerId, vaccineExpiry: "", notes: "" });
            if (petId) companionIds = [...companionIds, id];
            else petId = id;
          }
          if (saveBooking({ ...booking, petId, companionIds }).length === 0) navigate("/app/bookings");
        }}
      />
    </>
  );
}
