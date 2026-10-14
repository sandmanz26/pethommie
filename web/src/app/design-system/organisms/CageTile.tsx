import type { Cage, Pet } from "../../domain/types";
import { formatRupiah } from "../../domain/logic";
import { Avatar } from "../atoms/Avatar";
import { useAppT } from "../../i18n/useAppT";
import "./organisms.css";

/** A cage and who is in it tonight. */
export function CageTile({ cage, occupant, onEdit }: { cage: Cage; occupant?: Pet; onEdit: () => void }) {
  const { t, locale } = useAppT();
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
