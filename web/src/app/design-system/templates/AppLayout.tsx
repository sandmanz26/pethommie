import type { ReactNode } from "react";
import { AppNav } from "@/app/design-system/organisms/AppNav";
import "./templates.css";
import type { NavKey } from "@/app/design-system/organisms/navItems";

/** Signed-in workspace: navigation + one content column. */
export function AppLayout({
  hotelName,
  banner,
  onLogout,
  labels,
  children,
}: {
  hotelName: string;
  banner?: ReactNode;
  onLogout: () => void;
  /** Navigation labels that differ from the default ones (the hotel's word for its places). */
  labels?: Partial<Record<NavKey, string>>;
  children: ReactNode;
}) {
  return (
    <div className="app-root tpl-app">
      <AppNav hotelName={hotelName} onLogout={onLogout} labels={labels} />
      <main className="tpl-app__main">
        <div className="tpl-app__content">
          {banner}
          {children}
        </div>
      </main>
    </div>
  );
}
