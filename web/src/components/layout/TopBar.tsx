import { useLocale } from "../../i18n/LocaleProvider";
import { Button } from "../ui/Button";
import { Hanko } from "../ui/Hanko";
import { LanguageSwitch } from "./LanguageSwitch";
import "./layout.css";

export function TopBar() {
  const { t } = useLocale();
  return (
    <header className="topbar">
      <a className="topbar__brand" href="#top">
        <Hanko />
        {t.brand.name}
      </a>
      <nav className="topbar__nav" aria-label={t.nav.ariaLabel}>
        {t.nav.links.map((item) => (
          <a key={item.href} href={item.href}>
            {item.label}
          </a>
        ))}
      </nav>
      <div className="topbar__actions">
        <LanguageSwitch />
        <Button href="/app">{t.nav.cta}</Button>
      </div>
    </header>
  );
}
