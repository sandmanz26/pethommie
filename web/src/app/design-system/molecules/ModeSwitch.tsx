import { useMode } from "@/app/mode/ModeProvider";
import type { Mode } from "@/app/mode/mode";
import { useAppT } from "@/app/i18n/useAppT";
import { Segmented } from "./Segmented";

/** Simple / Advanced. `lead` adds a line under it saying what the chosen mode is. */
export function ModeSwitch({ lead }: { lead?: boolean }) {
  const { mode, setMode } = useMode();
  const { t } = useAppT();
  return (
    <div className="ds-modeswitch">
      <Segmented<Mode>
        label={t.mode.label}
        value={mode}
        onChange={setMode}
        options={[
          { value: "simple", label: t.mode.simple },
          { value: "advanced", label: t.mode.advanced },
        ]}
      />
      {lead && <p className="ds-muted">{mode === "simple" ? t.mode.simpleLead : t.mode.advancedLead}</p>}
    </div>
  );
}
