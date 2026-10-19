import type { ReactNode } from "react";
import { AppNav } from "@/app/design-system/organisms/AppNav";
import { useAppT } from "@/app/i18n/useAppT";
import "./templates.css";

/** Signed-in workspace: navigation + one content column. */
export function AppLayout({ hotelName, banner, onLogout, children }: { hotelName: string; banner?: ReactNode; onLogout: () => void; children: ReactNode }) {
  const { t } = useAppT();
  return (
    <div className="app-root tpl-app">
      <AppNav hotelName={hotelName} onLogout={onLogout} />
      <main className="tpl-app__main">
        <div className="tpl-app__content">
          {banner}
          {children}
        </div>
        <p className="tpl-app__demo">{t.common.demoNote}</p>
      </main>
    </div>
  );
}
