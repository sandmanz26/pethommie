import type { InputHTMLAttributes, ReactNode } from "react";
import "./atoms.css";

/** A tick box with its label, big enough to tap. */
export function Checkbox({ label, className = "", ...rest }: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { label: ReactNode }) {
  return (
    <label className={`ds-check ${className}`}>
      <input type="checkbox" {...rest} />
      <span>{label}</span>
    </label>
  );
}
