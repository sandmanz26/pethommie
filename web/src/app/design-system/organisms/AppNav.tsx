import { useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Hanko } from "@/shared/ui/Hanko";
import { NavIcon } from "@/app/design-system/atoms/NavIcon";
import { Button } from "@/app/design-system/atoms/Button";
import { useMode } from "@/app/mode/ModeProvider";
import { useAppT } from "@/app/i18n/useAppT";
import { sideNav, tabItems, type NavGroup, type NavItem, type NavKey } from "./navItems";
import "./organisms.css";

/** Sidebar on wide screens, bottom tab bar on phones. */
export function AppNav({ hotelName, onLogout, labels = {} }: { hotelName: string; onLogout: () => void; labels?: Partial<Record<NavKey, string>> }) {
  const { t } = useAppT();
  const { advanced } = useMode();
  const nav = sideNav(advanced);
  const link = (i: NavItem) => (
    <NavLink key={i.to} to={i.to} end={i.end} className="ds-sidenav__link">
      <NavIcon name={i.art} />
      {labels[i.key] ?? t.nav[i.key]}
    </NavLink>
  );
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
          {nav.top.map(link)}
          {nav.groups.map((g) => (g.items.length === 1 ? link(g.items[0]) : <SideGroup key={g.key} group={g} title={t.nav.groups[g.key]} link={link} />))}
        </nav>
        <div className="ds-sidenav__foot">
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

/** A fold in the sidebar: open while one of its pages is showing, and whenever opened by hand. */
function SideGroup({ group, title, link }: { group: NavGroup; title: string; link: (i: NavItem) => ReactNode }) {
  const { pathname } = useLocation();
  const here = group.items.some((i) => (i.end ? pathname === i.to : pathname === i.to || pathname.startsWith(`${i.to}/`)));
  const [open, setOpen] = useState(here);
  const shown = open || here;
  const id = `nav-group-${group.key}`;
  return (
    <div className={`ds-sidenav__group${here ? " is-here" : ""}`}>
      <button type="button" className="ds-sidenav__link ds-sidenav__toggle" aria-expanded={shown} aria-controls={id} onClick={() => setOpen(!shown)}>
        <NavIcon name={group.art} />
        <span>{title}</span>
        <svg className="ds-sidenav__chevron" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div id={id} className="ds-sidenav__sub" hidden={!shown}>
        {group.items.map(link)}
      </div>
    </div>
  );
}
