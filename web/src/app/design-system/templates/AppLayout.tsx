import type { ReactNode } from "react";
import { AppNav } from "../organisms/AppNav";
import { useAppT } from "../../i18n/useAppT";
import "./templates.css";

/** Signed-in workspace: navigation + one content column. */
export function AppLayout({ hotelName, children }: { hotelName: string; children: ReactNode }) {
  const { t } = useAppT();
  return (
    <div className="app-root tpl-app">
      <AppNav hotelName={hotelName} />
      <main className="tpl-app__main">
        <div className="tpl-app__content">{children}</div>
        <p className="tpl-app__demo">{t.common.demoNote}</p>
      </main>
    </div>
  );
}
