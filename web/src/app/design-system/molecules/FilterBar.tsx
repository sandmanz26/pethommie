import type { ReactNode } from "react";
import { Button } from "@/app/design-system/atoms/Button";
import "./molecules.css";

/** A row of filters over a list, with how many are shown and a way to clear them. */
export function FilterBar({ children, count, active, onClear, clearLabel }: { children: ReactNode; count: string; active: boolean; onClear: () => void; clearLabel: string }) {
  return (
    <div className="ds-filters">
      <div className="ds-filters__fields">{children}</div>
      <div className="ds-filters__foot" aria-live="polite">
        <span>{count}</span>
        {active && (
          <Button variant="ghost" size="sm" icon="x" onClick={onClear}>
            {clearLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
