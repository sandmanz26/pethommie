import { NavLink } from "react-router-dom";
import { Hanko } from "@/shared/ui/Hanko";
import { Icon } from "@/app/design-system/atoms/Icon";
import { Button } from "@/app/design-system/atoms/Button";
import { ModeSwitch } from "@/app/design-system/molecules/ModeSwitch";
import { useMode } from "@/app/mode/ModeProvider";
import { useAppT } from "@/app/i18n/useAppT";
import { sideItems, tabItems } from "./navItems";
import "./organisms.css";

/** Sidebar on wide screens, bottom tab bar on phones. */
export function AppNav({ hotelName, onLogout }: { hotelName: string; onLogout: () => void }) {
  const { t } = useAppT();
  const { advanced } = useMode();
  return (
    <>
      <aside className="ds-sidenav">
        <div className="ds-sidenav__brand">
          <Hanko size={32} />
          <div>
            <b>Pethommie</b>
            <span>{hotelName}</span>
          </div>
        </div>
        <Button to="/app/bookings/new" icon="plus" block>
          {t.nav.newBooking}
        </Button>
        <nav className="ds-sidenav__links" aria-label="App">
          {sideItems(advanced).map((i) => (
            <NavLink key={i.to} to={i.to} end={i.end} className="ds-sidenav__link">
              <Icon name={i.icon} />
              {t.nav[i.key]}
            </NavLink>
          ))}
        </nav>
        <div className="ds-sidenav__foot">
          <ModeSwitch />
          <NavLink to="/" className="ds-sidenav__link">
            <Icon name="home" />
            {t.nav.backToSite}
          </NavLink>
          <button type="button" className="ds-sidenav__link" onClick={onLogout}>
            <Icon name="logout" />
            {t.nav.logout}
          </button>
        </div>
      </aside>

      <nav className="ds-tabbar" aria-label="App">
        {tabItems.map((i) => (
          <NavLink key={i.to} to={i.to} end={i.end} className="ds-tabbar__link">
            <Icon name={i.icon} size={22} />
            <span>{t.nav[i.key]}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
