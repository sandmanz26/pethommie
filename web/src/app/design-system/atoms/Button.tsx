import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";
import { Icon, type IconName } from "./Icon";
import "./atoms.css";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

type Common = {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  block?: boolean;
  children?: ReactNode;
  className?: string;
};

type AsButton = Common & ButtonHTMLAttributes<HTMLButtonElement> & { to?: undefined };
type AsLink = Common & { to: string; onClick?: () => void; "aria-label"?: string };

/** The one button. Pass `to` to render a router link styled as a button. */
export function Button(props: AsButton | AsLink) {
  const { variant = "primary", size = "md", icon, block, children, className = "" } = props;
  const cls = ["ds-btn", `ds-btn--${variant}`, `ds-btn--${size}`, block && "ds-btn--block", !children && "ds-btn--icon", className]
    .filter(Boolean)
    .join(" ");
  const content = (
    <>
      {icon && <Icon name={icon} size={size === "sm" ? 16 : 18} />}
      {children && <span>{children}</span>}
    </>
  );
  if (props.to !== undefined) {
    return (
      <Link className={cls} to={props.to} onClick={props.onClick} aria-label={props["aria-label"]}>
        {content}
      </Link>
    );
  }
  const { variant: _v, size: _s, icon: _i, block: _b, children: _c, className: _cn, to: _t, type = "button", ...rest } = props;
  return (
    <button className={cls} type={type} {...rest}>
      {content}
    </button>
  );
}
