import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";
import "./ui.css";

type Variant = "solid" | "ghost" | "seal";

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; variant?: Variant };
type NativeButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined; variant?: Variant };

/** Pill button. Renders an <a> when given `href`, otherwise a <button>. */
export function Button(props: LinkProps | NativeButtonProps) {
  const { variant = "solid", className = "", ...rest } = props;
  const cls = `btn btn--${variant} ${className}`.trim();
  if (rest.href !== undefined) {
    return <a className={cls} {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)} />;
  }
  return <button className={cls} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)} />;
}
