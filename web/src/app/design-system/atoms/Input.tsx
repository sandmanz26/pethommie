import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import "./atoms.css";

type Invalid = { invalid?: boolean };

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & Invalid>(
  function Input({ invalid, className = "", ...rest }, ref) {
    return <input ref={ref} className={`ds-control ${className}`} aria-invalid={invalid || undefined} {...rest} />;
  },
);

export function Select({ invalid, className = "", children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & Invalid) {
  return (
    <select className={`ds-control ds-control--select ${className}`} aria-invalid={invalid || undefined} {...rest}>
      {children}
    </select>
  );
}

export function Textarea({ invalid, className = "", ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & Invalid) {
  return <textarea className={`ds-control ds-control--area ${className}`} aria-invalid={invalid || undefined} rows={3} {...rest} />;
}
