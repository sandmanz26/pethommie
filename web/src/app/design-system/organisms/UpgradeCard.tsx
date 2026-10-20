import type { NavArt } from "@/app/design-system/atoms/art";
import { Button } from "@/app/design-system/atoms/Button";
import { NavIcon } from "@/app/design-system/atoms/NavIcon";
import { useAppT } from "@/app/i18n/useAppT";
import "./organisms.css";

const ART: NavArt[] = ["customers", "transactions", "invoices", "tax"];

/** For a hotel on Simple: what Advanced adds, and one button to switch. Nothing about the data changes. */
export function UpgradeCard({ onUpgrade }: { onUpgrade: () => void }) {
  const { t } = useAppT();
  const u = t.upgrade;
  return (
    <section className="ds-upgrade" aria-labelledby="upgrade-title">
      <div className="ds-upgrade__head">
        <NavIcon name="upgrade" size={56} />
        <div>
          <h2 id="upgrade-title">{u.title}</h2>
          <p>{u.lead}</p>
        </div>
      </div>
      <ul className="ds-upgrade__list">
        {u.items.map((item, i) => (
          <li key={item.title}>
            <NavIcon name={ART[i]} size={34} />
            <span>
              <b>{item.title}</b>
              <small>{item.body}</small>
            </span>
          </li>
        ))}
      </ul>
      <div className="ds-upgrade__foot">
        <Button icon="check" onClick={onUpgrade}>
          {u.cta}
        </Button>
        <small>{u.note}</small>
      </div>
    </section>
  );
}
