import type { Species } from "@/app/domain/types";
import "./atoms.css";

/** Round marker for a pet: the first letter of its name, on a disc tinted by species. */
export function Avatar({ name, species, size = 40 }: { name: string; species: Species; size?: number }) {
  return (
    <span className={`ds-avatar ds-avatar--${species}`} style={{ width: size, height: size, fontSize: size * 0.42 }} aria-hidden="true">
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
