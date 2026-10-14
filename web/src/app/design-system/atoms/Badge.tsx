import type { ReactNode } from "react";
import "./atoms.css";

export type Tone = "neutral" | "ok" | "warn" | "danger" | "info" | "brand";

/** Small status label. Tone carries meaning; the text must still say it. */
export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`ds-badge ds-badge--${tone}`}>{children}</span>;
}
