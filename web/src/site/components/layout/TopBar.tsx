import { useSiteT } from "@/site/i18n/useSiteT";
import { Button } from "@/site/components/ui/Button";
import { Hanko } from "@/shared/ui/Hanko";
import { LanguageSwitch } from "@/shared/ui/LanguageSwitch";
import "./layout.css";

export function TopBar() {
  const { t } = useSiteT();
  return (
    <header className="topbar">
      <a className="topbar__brand" href="#top" aria-label={t.brand.name}>
        <Hanko />
        <span className="topbar__name">{t.brand.name}</span>
      </a>
      <nav className="topbar__nav" aria-label={t.nav.ariaLabel}>
        {t.nav.links.map((item) => (
          <a key={item.href} href={item.href}>
            {item.label}
          </a>
        ))}
      </nav>
      <div className="topbar__actions">
        <LanguageSwitch label={t.nav.languageLabel} />
        <a className="topbar__login" href="/app/login">
          {t.nav.login}
        </a>
        <Button href="/app/register">{t.nav.cta}</Button>
      </div>
    </header>
  );
}
