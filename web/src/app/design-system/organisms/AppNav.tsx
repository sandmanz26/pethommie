import { NavLink } from "react-router-dom";
import { Hanko } from "@/shared/ui/Hanko";
import { NavIcon } from "@/app/design-system/atoms/NavIcon";
import { Button } from "@/app/design-system/atoms/Button";
import { useMode } from "@/app/mode/ModeProvider";
import { useAppT } from "@/app/i18n/useAppT";
import { sideItems, tabItems, type NavKey } from "./navItems";
import "./organisms.css";

/** Sidebar on wide screens, bottom tab bar on phones. */
export function AppNav({ hotelName, onLogout, labels = {} }: { hotelName: string; onLogout: () => void; labels?: Partial<Record<NavKey, string>> }) {
  const { t } = useAppT();
  const { advanced } = useMode();
  return (
    <>
      <aside className="ds-sidenav">
        {/* The logo goes home, to the website, as logos do. */}
        <a className="ds-sidenav__brand" href="/">
          <Hanko size={32} />
          <div>
            <b>Pethommie</b>
            <span>{hotelName}</span>
          </div>
        </a>
        <Button to="/app/bookings/new" icon="plus" block>
          {t.nav.newBooking}
        </Button>
        <nav className="ds-sidenav__links" aria-label="App">
          {sideItems(advanced).map((i) => (
            <NavLink key={i.to} to={i.to} end={i.end} className="ds-sidenav__link">
              <NavIcon name={i.art} />
              {labels[i.key] ?? t.nav[i.key]}
            </NavLink>
          ))}
        </nav>
        <div className="ds-sidenav__foot">
          <NavLink to="/" className="ds-sidenav__link">
            <NavIcon name="website" />
            {t.nav.backToSite}
          </NavLink>
          <button type="button" className="ds-sidenav__link" onClick={onLogout}>
            <NavIcon name="logout" />
            {t.nav.logout}
          </button>
        </div>
      </aside>

      <nav className="ds-tabbar" aria-label="App">
        {tabItems.map((i) => (
          <NavLink key={i.to} to={i.to} end={i.end} className="ds-tabbar__link">
            <NavIcon name={i.art} size={24} />
            <span>{labels[i.key] ?? t.nav[i.key]}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
