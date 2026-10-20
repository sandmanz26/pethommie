import type { ReactNode } from "react";
import { Icon, type IconName } from "@/app/design-system/atoms/Icon";
import "./molecules.css";

/** Something is empty. Say what, with a line icon. */
export function EmptyState({ icon, children, action }: { icon?: IconName; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="ds-empty">
      {icon && (
        <span className="ds-empty__icon">
          <Icon name={icon} size={22} />
        </span>
      )}
      <p>{children}</p>
      {action}
    </div>
  );
}
