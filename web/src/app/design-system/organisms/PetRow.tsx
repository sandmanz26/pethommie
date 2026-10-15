import { Link } from "react-router-dom";
import type { Owner, Pet } from "@/app/domain/types";
import { vaccineState, type VaccineState } from "@/app/domain/logic";
import { formatWhatsapp } from "@/shared/lib/phone";
import { Avatar } from "@/app/design-system/atoms/Avatar";
import { Badge, type Tone } from "@/app/design-system/atoms/Badge";
import { Icon } from "@/app/design-system/atoms/Icon";
import { useAppT } from "@/app/i18n/useAppT";
import "./organisms.css";

const tone: Record<VaccineState, Tone> = { ok: "ok", soon: "warn", expired: "danger", unknown: "neutral" };

export function PetRow({ pet, owner, stays, today }: { pet: Pet; owner?: Owner; stays: number; today: string }) {
  const { t } = useAppT();
  const v = vaccineState(pet, today);
  return (
    <Link to={`/app/pets/${pet.id}`} className="ds-petrow">
      <Avatar name={pet.name} species={pet.species} />
      <div className="ds-petrow__main">
        <b>{pet.name}</b>
        <span>
          {t.common.species[pet.species]}
          {pet.breed && ` · ${pet.breed}`} · {t.pets.stays(stays)}
        </span>
        <span>
          {owner?.name}
          {owner?.whatsapp && ` · ${formatWhatsapp(owner.whatsapp)}`}
        </span>
      </div>
      <Badge tone={tone[v]}>{t.pets.vaccine[v]}</Badge>
      <Icon name="chevronRight" className="ds-petrow__chev" />
    </Link>
  );
}
