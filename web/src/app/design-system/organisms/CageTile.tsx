import type { Cage, Pet } from "@/app/domain/types";
import { formatRupiah } from "@/app/domain/logic";
import { Avatar } from "@/app/design-system/atoms/Avatar";
import { useAppT } from "@/app/i18n/useAppT";
import "./organisms.css";

/** A cage and who is in it tonight; for a shared room, the pets in it and the places taken. */
export function CageTile({ cage, occupant, guests = [], used = 0, onEdit }: { cage: Cage; occupant?: Pet; guests?: Pet[]; used?: number; onEdit: () => void }) {
  const { t, locale } = useAppT();
  if (cage.capacity > 1) {
    return (
      <button type="button" className={`ds-cage ds-cage--room${used ? " is-occupied" : ""}`} onClick={onEdit}>
        <span className="ds-cage__head">
          <b>{cage.name}</b>
          <span className="ds-cage__size">{t.cages.places(used, cage.capacity)}</span>
        </span>
        <span className="ds-cage__meter" aria-hidden="true">
          <i style={{ width: `${Math.min(100, (used / cage.capacity) * 100)}%` }} />
        </span>
        {guests.length ? (
          <span className="ds-cage__occupant">
            {guests.slice(0, 4).map((p) => (
              <Avatar key={p.id} name={p.name} species={p.species} size={24} />
            ))}
            {guests.length > 4 && <small>+{guests.length - 4}</small>}
          </span>
        ) : (
          <span className="ds-cage__free">{t.cages.free}</span>
        )}
        <span className="ds-cage__price">
          {formatRupiah(cage.pricePerNight, locale)} <small>{t.common.perNight}</small>
        </span>
      </button>
    );
  }
  return (
    <button type="button" className={`ds-cage${occupant ? " is-occupied" : ""}`} onClick={onEdit}>
      <span className="ds-cage__head">
        <b>{cage.name}</b>
        <span className="ds-cage__size">{t.common.sizes[cage.size]}</span>
      </span>
      {occupant ? (
        <span className="ds-cage__occupant">
          <Avatar name={occupant.name} species={occupant.species} size={26} />
          {t.cages.occupied(occupant.name)}
        </span>
      ) : (
        <span className="ds-cage__free">{t.cages.free}</span>
      )}
      <span className="ds-cage__price">
        {formatRupiah(cage.pricePerNight, locale)} <small>{t.common.perNight}</small>
      </span>
    </button>
  );
}
