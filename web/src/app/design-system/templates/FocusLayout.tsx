import type { ReactNode } from "react";
import { Hanko } from "@/shared/ui/Hanko";
import { useAppT } from "@/app/i18n/useAppT";
import { LanguageSwitch } from "@/shared/ui/LanguageSwitch";
import "./templates.css";

/** Focused single-column flow with no navigation: sign in, sign up and first-run setup. */
export function FocusLayout({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  const { t } = useAppT();
  return (
    <div className="app-root tpl-focus">
      <header className="tpl-focus__bar">
        <span className="tpl-focus__brand">
          <Hanko size={28} /> Pethommie
        </span>
        <LanguageSwitch label={t.settings.language} />
      </header>
      <main className="tpl-focus__main">
        <div className="tpl-focus__card">{children}</div>
        {aside && <div className="tpl-focus__aside">{aside}</div>}
      </main>
    </div>
  );
}
