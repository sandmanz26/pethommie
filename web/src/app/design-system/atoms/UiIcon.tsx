import type { UiIconName } from "./uiIcons";
import "./atoms.css";

/**
 * Decorative: whatever it stands for is always written next to it. The sources are small (about 60 px), so
 * keep it at 40 px or less to stay sharp on 2x screens.
 */
export function UiIcon({ name, size = 28, className = "" }: { name: UiIconName; size?: number; className?: string }) {
  return <img className={`ds-uiicon ${className}`} src={`/icons/ui/${name}.webp`} width={size} height={size} alt="" decoding="async" />;
}
