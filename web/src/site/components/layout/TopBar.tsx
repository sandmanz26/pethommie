import { useSiteT } from "@/site/i18n/useSiteT";
import { Button } from "@/site/components/ui/Button";
import { Hanko } from "@/shared/ui/Hanko";
import { LanguageSwitch } from "@/shared/ui/LanguageSwitch";
import "./layout.css";

/** On the landing page the links jump within it; on other pages they lead back to it. */
export function TopBar({ onLanding = true }: { onLanding?: boolean }) {
  const { t } = useSiteT();
  return (
    <header className="topbar">
      <a className="topbar__brand" href={onLanding ? "#top" : "/"}>
        <Hanko />
        <span className="topbar__name">{t.brand.name}</span>
      </a>
      <nav className="topbar__nav" aria-label={t.nav.ariaLabel}>
        {t.nav.links.map((item) => (
          <a key={item.href} href={onLanding ? item.href : `/${item.href}`}>
            {item.label}
          </a>
        ))}
      </nav>
      <div className="topbar__actions">
        <LanguageSwitch label={t.nav.languageLabel} />
        <a className="topbar__login" href="/app/login">
          {t.nav.login}
        </a>
        <a className="topbar__try" href={t.nav.tryNow.href}>
          {/* One of the two shows, so the link's name is always the word on screen. */}
          <span className="topbar__try-long">{t.nav.tryNow.label}</span>
          <span className="topbar__try-short">{t.nav.tryNow.short}</span>
        </a>
        <Button href="/app/register">{t.nav.cta}</Button>
      </div>
    </header>
  );
}
