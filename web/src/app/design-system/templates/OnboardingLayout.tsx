import type { ReactNode } from "react";
import { Hanko } from "@/shared/ui/Hanko";
import { useAppT } from "@/app/i18n/useAppT";
import { LanguageSwitch } from "@/shared/ui/LanguageSwitch";
import "./templates.css";

/** Focused single-column flow with no navigation, for first-run setup. */
export function OnboardingLayout({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  const { t } = useAppT();
  return (
    <div className="app-root tpl-onb">
      <header className="tpl-onb__bar">
        <span className="tpl-onb__brand">
          <Hanko size={28} /> Pethommie
        </span>
        <LanguageSwitch label={t.settings.language} />
      </header>
      <main className="tpl-onb__main">
        <div className="tpl-onb__card">{children}</div>
        {aside && <div className="tpl-onb__aside">{aside}</div>}
      </main>
    </div>
  );
}
