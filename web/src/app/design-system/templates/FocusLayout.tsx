import type { ReactNode } from "react";
import { Hanko } from "@/shared/ui/Hanko";
import { useAppT } from "@/app/i18n/useAppT";
import { LanguageSwitch } from "@/shared/ui/LanguageSwitch";
import "./templates.css";

/** A scene behind the card. Its middle should be empty: the card sits there on a wide screen. */
export type FocusArt = { src: string; srcSet: string; width: number; height: number };

/** Focused single-column flow with no navigation: sign in, sign up and first-run setup. */
export function FocusLayout({ children, aside, art }: { children: ReactNode; aside?: ReactNode; art?: FocusArt }) {
  const { t } = useAppT();
  return (
    <div className={`app-root tpl-focus${art ? " tpl-focus--art" : ""}`}>
      {art && <img className="tpl-focus__art" src={art.src} srcSet={art.srcSet} sizes="100vw" width={art.width} height={art.height} alt="" decoding="async" />}
      <header className="tpl-focus__bar">
        <a className="tpl-focus__brand" href="/">
          <Hanko size={28} /> Pethommie
        </a>
        <LanguageSwitch label={t.settings.language} />
      </header>
      <main className="tpl-focus__main">
        <div className="tpl-focus__card">{children}</div>
        {aside && <div className="tpl-focus__aside">{aside}</div>}
      </main>
    </div>
  );
}
