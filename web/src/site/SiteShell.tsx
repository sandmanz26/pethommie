import { Outlet } from "react-router-dom";
import { useBodyTheme } from "@/shared/hooks/useBodyTheme";

/** Everything on the marketing site sits inside this: it claims <body> for the site palette (styles load from main.tsx). */
export function SiteShell() {
  useBodyTheme("site");
  return <Outlet />;
}
