import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react";
import "./molecules.css";

type ControlProps = { id?: string; invalid?: boolean; "aria-describedby"?: string };

/** Label + control + hint/error. Wires ids and aria for the control it wraps. */
export function Field({
  label,
  hint,
  error,
  optional,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  optional?: string;
  children: ReactElement<ControlProps>;
}) {
  const auto = useId();
  const id = children.props.id ?? auto;
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  const control = isValidElement(children)
    ? cloneElement(children, { id, invalid: !!error, "aria-describedby": describedBy })
    : children;
  return (
    <div className="ds-field">
      <label className="ds-field__label" htmlFor={id}>
        {label}
        {optional && <span className="ds-field__optional"> ({optional})</span>}
      </label>
      {control}
      {error ? (
        <p className="ds-field__error" id={`${id}-err`} role="alert">
          {error}
        </p>
      ) : (
        hint && (
          <p className="ds-field__hint" id={`${id}-hint`}>
            {hint}
          </p>
        )
      )}
    </div>
  );
}
