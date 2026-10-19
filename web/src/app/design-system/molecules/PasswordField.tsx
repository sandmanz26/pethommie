import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { Icon } from "@/app/design-system/atoms/Icon";
import { Input } from "@/app/design-system/atoms/Input";
import "./molecules.css";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  invalid?: boolean;
  showLabel: string;
  hideLabel: string;
};

/** A password input with a show/hide button. Wrap it in `Field`, like any other control. */
export const PasswordInput = forwardRef<HTMLInputElement, Props>(function PasswordInput({ showLabel, hideLabel, ...rest }, ref) {
  const [shown, setShown] = useState(false);
  return (
    <div className="ds-password">
      <Input ref={ref} type={shown ? "text" : "password"} {...rest} />
      <button type="button" className="ds-password__toggle" aria-label={shown ? hideLabel : showLabel} aria-pressed={shown} onClick={() => setShown(!shown)}>
        <Icon name={shown ? "eyeOff" : "eye"} size={20} />
      </button>
    </div>
  );
});
