import type { ElementType, ReactNode } from "react";
import "./atoms.css";

/** Headings and supporting text with the app's type scale. */
export function Heading({ level = 2, size, children, className = "" }: { level?: 1 | 2 | 3; size?: "xl" | "lg" | "md" | "sm"; children: ReactNode; className?: string }) {
  const Tag = `h${level}` as ElementType;
  const s = size ?? ({ 1: "xl", 2: "lg", 3: "md" } as const)[level];
  return <Tag className={`ds-heading ds-heading--${s} ${className}`}>{children}</Tag>;
}

export function Muted({ children, as: Tag = "p", className = "" }: { children: ReactNode; as?: ElementType; className?: string }) {
  return <Tag className={`ds-muted ${className}`}>{children}</Tag>;
}
