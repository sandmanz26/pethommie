import type { ReactNode } from "react";
import { Icon, type IconName } from "@/app/design-system/atoms/Icon";
import { Illustration } from "@/app/design-system/atoms/Illustration";
import type { IllustrationName } from "@/app/design-system/atoms/art";
import "./molecules.css";

/** Something is empty. Say what, with an illustration (`art`) or a line icon. */
export function EmptyState({ icon, art, children, action }: { icon?: IconName; art?: IllustrationName; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="ds-empty">
      {art && <Illustration name={art} height={120} />}
      {!art && icon && (
        <span className="ds-empty__icon">
          <Icon name={icon} size={22} />
        </span>
      )}
      <p>{children}</p>
      {action}
    </div>
  );
}
