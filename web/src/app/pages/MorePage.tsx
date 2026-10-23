import { useNavigate } from "react-router-dom";
import { useAuth } from "@/app/auth/AuthProvider";
import { useMode } from "@/app/mode/ModeProvider";
import { useAppT } from "@/app/i18n/useAppT";
import { Icon } from "@/app/design-system/atoms/Icon";
import { NavIcon } from "@/app/design-system/atoms/NavIcon";
import { moreItems } from "@/app/design-system/organisms/navItems";
import { PageHeader } from "@/app/design-system/organisms/PageHeader";
import { Link } from "react-router-dom";
import "./pages.css";
import { useUnitWords } from "@/app/i18n/useUnitWords";

/** Everything that isn't on the phone's tab bar, plus the mode switch. Also reachable on a wide screen. */
export function MorePage() {
  const { t } = useAppT();
  const units = useUnitWords();
  const { advanced } = useMode();
  const { logout } = useAuth();
  const navigate = useNavigate();
  return (
    <>
      <PageHeader title={t.more.title} lead={t.more.lead} />
      <nav className="pg-morelist" aria-label={t.more.title}>
        {moreItems(advanced).map((i) => (
          <Link key={i.to} to={i.to} className="pg-morelist__item">
            <NavIcon name={i.art} />
            <span>{i.key === "cages" ? units.many : t.nav[i.key]}</span>
            <Icon name="chevronRight" size={18} />
          </Link>
        ))}
        <Link to="/" className="pg-morelist__item">
          <NavIcon name="website" />
          <span>{t.nav.backToSite}</span>
          <Icon name="chevronRight" size={18} />
        </Link>
        <button
          type="button"
          className="pg-morelist__item"
          onClick={async () => {
            await logout();
            navigate("/app/login", { replace: true });
          }}
        >
          <NavIcon name="logout" />
          <span>{t.nav.logout}</span>
        </button>
      </nav>
    </>
  );
}
