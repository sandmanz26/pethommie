import { brand } from "../../content/landing";
import "./ui.css";

/** The vermilion seal mark. Decorative; the brand name is always set beside it. */
export function Hanko({ size = 30 }: { size?: number }) {
  return (
    <span className="hanko" style={{ width: size, height: size, fontSize: size * 0.5 }} aria-hidden="true">
      {brand.seal}
    </span>
  );
}
