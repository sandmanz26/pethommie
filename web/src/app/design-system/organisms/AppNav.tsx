import { NavLink } from "react-router-dom";
import { Hanko } from "@/shared/ui/Hanko";
import { Icon, type IconName } from "@/app/design-system/atoms/Icon";
import { Button } from "@/app/design-system/atoms/Button";
import { useAppT } from "@/app/i18n/useAppT";
import "./organisms.css";

const items: { to: string; key: "today" | "bookings" | "calendar" | "pets" | "cages" | "settings"; icon: IconName; end?: boolean }[] = [
  { to: "/app", key: "today", icon: "today", end: true },
  { to: "/app/bookings", key: "bookings", icon: "bookings" },
  { to: "/app/calendar", key: "calendar", icon: "calendar" },
  { to: "/app/pets", key: "pets", icon: "pets" },
  { to: "/app/cages", key: "cages", icon: "cages" },
  { to: "/app/settings", key: "settings", icon: "settings" },
];

/** Sidebar on wide screens, bottom tab bar on phones. */
export function AppNav({ hotelName, onLogout }: { hotelName: string; onLogout: () => void }) {
  const { t } = useAppT();
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
          {items.map((i) => (
            <NavLink key={i.to} to={i.to} end={i.end} className="ds-sidenav__link">
              <Icon name={i.icon} />
              {t.nav[i.key]}
            </NavLink>
          ))}
        </nav>
        <div className="ds-sidenav__foot">
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
        {items.map((i) => (
          <NavLink key={i.to} to={i.to} end={i.end} className="ds-tabbar__link">
            <Icon name={i.icon} size={22} />
            <span>{t.nav[i.key]}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
