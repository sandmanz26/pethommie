import type { ReactNode } from "react";
import { Icon, type IconName } from "../atoms/Icon";
import "./molecules.css";

export function EmptyState({ icon, children, action }: { icon: IconName; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="ds-empty">
      <span className="ds-empty__icon">
        <Icon name={icon} size={22} />
      </span>
      <p>{children}</p>
      {action}
    </div>
  );
}
