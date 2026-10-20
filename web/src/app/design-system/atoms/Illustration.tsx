import type { IllustrationName } from "./art";
import "./atoms.css";

/** A decorative diorama in the brand's style. The box has a fixed height so nothing jumps while it loads. */
export function Illustration({ name, height = 140, className = "" }: { name: IllustrationName; height?: number; className?: string }) {
  return (
    <div className={`ds-illus ${className}`} style={{ "--illus-h": `${height}px` } as React.CSSProperties} aria-hidden="true">
      <img src={`/illustrations/${name}.webp`} alt="" decoding="async" />
    </div>
  );
}
