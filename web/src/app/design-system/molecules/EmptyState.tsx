import type { ReactNode } from "react";
import { Icon, type IconName } from "@/app/design-system/atoms/Icon";
import { UiIcon } from "@/app/design-system/atoms/UiIcon";
import type { UiIconName } from "@/app/design-system/atoms/uiIcons";
import "./molecules.css";

/** Something is empty. Say what, with an illustrated icon (`art`) or a plain line icon (`icon`). */
export function EmptyState({ icon, art, children, action }: { icon?: IconName; art?: UiIconName; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="ds-empty">
      {art ? (
        <UiIcon name={art} size={48} />
      ) : (
        icon && (
          <span className="ds-empty__icon">
            <Icon name={icon} size={22} />
          </span>
        )
      )}
      <p>{children}</p>
      {action}
    </div>
  );
}
