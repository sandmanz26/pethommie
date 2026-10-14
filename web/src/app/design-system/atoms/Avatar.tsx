import type { Species } from "../../domain/types";
import "./atoms.css";

/** Round marker for a pet: its initial on a disc tinted by species. */
export function Avatar({ name, species, size = 40 }: { name: string; species: Species; size?: number }) {
  return (
    <span className={`ds-avatar ds-avatar--${species}`} style={{ width: size, height: size, fontSize: size * 0.42 }} aria-hidden="true">
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
