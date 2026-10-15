import "./atoms.css";

/** The cut-outs in public/illustrations (generated from resources/illustrations). */
export type IllustrationName =
  | "setup-store"
  | "setup-price"
  | "pickup-delivery"
  | "additional-service"
  | "free-grooming"
  | "free-hairstylist"
  | "playing-time"
  | "dog-walking"
  | "cat-ear-cleaning"
  | "24-hour-cctv"
  | "dog-diaper"
  | "free-snacks";

/**
 * A decorative illustration. The box is a fixed height so nothing jumps while the image loads.
 * The art is about 350 px wide at source, so keep it at ~180 px or less to stay sharp on 2x screens.
 */
export function Illustration({ name, height = 150, className = "" }: { name: IllustrationName; height?: number; className?: string }) {
  return (
    <div className={`ds-illus ${className}`} style={{ "--illus-h": `${height}px` } as React.CSSProperties} aria-hidden="true">
      <img src={`/illustrations/${name}.webp`} alt="" decoding="async" />
    </div>
  );
}
