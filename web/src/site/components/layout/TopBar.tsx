import { useEffect, useState } from "react";
import { useSiteT } from "@/site/i18n/useSiteT";
import { Button } from "@/site/components/ui/Button";
import { Hanko } from "@/shared/ui/Hanko";
import { LanguageSwitch } from "@/shared/ui/LanguageSwitch";
import "./layout.css";

/** True while a section marked `data-dark` (an ink section) is under the bar, so the bar can turn dark with it. */
function useOverDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    let frame = 0;
    const check = () => {
      frame = 0;
      const line = 32;
      setDark([...document.querySelectorAll("[data-dark]")].some((el) => {
        const r = el.getBoundingClientRect();
        return r.top <= line && r.bottom >= line;
      }));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);
  return dark;
}

/** On the landing page the links jump within it; on other pages they lead back to it. */
export function TopBar({ onLanding = true }: { onLanding?: boolean }) {
  const { t } = useSiteT();
  const dark = useOverDark();
  return (
    <header className={`topbar${dark ? " topbar--dark" : ""}`}>
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
        <Button href="/app/register">{t.nav.cta}</Button>
      </div>
    </header>
  );
}
