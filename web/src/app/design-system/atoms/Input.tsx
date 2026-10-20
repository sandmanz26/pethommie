import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
export { Select } from "@/shared/ui/Select";
import "./atoms.css";

type Invalid = { invalid?: boolean };

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & Invalid>(
  function Input({ invalid, className = "", ...rest }, ref) {
    return <input ref={ref} className={`ds-control ${className}`} aria-invalid={invalid || undefined} {...rest} />;
  },
);

export function Textarea({ invalid, className = "", ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & Invalid) {
  return <textarea className={`ds-control ds-control--area ${className}`} aria-invalid={invalid || undefined} rows={3} {...rest} />;
}
