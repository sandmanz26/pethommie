import type { ReactNode } from "react";
import { Icon } from "../atoms/Icon";
import "./molecules.css";

export function Alert({ tone = "warn", children }: { tone?: "warn" | "danger" | "info" | "ok"; children: ReactNode }) {
  return (
    <div className={`ds-alert ds-alert--${tone}`} role={tone === "danger" ? "alert" : "status"}>
      <Icon name={tone === "ok" ? "check" : "alert"} size={18} />
      <div>{children}</div>
    </div>
  );
}
