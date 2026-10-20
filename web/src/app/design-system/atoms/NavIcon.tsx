import type { NavArt } from "./art";
import "./atoms.css";

/** An illustrated navigation icon. Decorative: the label is always written beside it. */
export function NavIcon({ name, size = 26 }: { name: NavArt; size?: number }) {
  return <img className="ds-navicon" src={`/icons/nav/${name}.webp`} width={size} height={size} alt="" decoding="async" />;
}
