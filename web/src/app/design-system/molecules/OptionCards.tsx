import { useId } from "react";
import { Icon, type IconName } from "@/app/design-system/atoms/Icon";
import "./molecules.css";

/**
 * Pick one of a few options that each need a line of explaining, as stacked cards (icon, title, subtitle) instead of
 * a row of tabs: a tab bar forces every label onto one line and breaks once the text is more than a couple of words.
 */
export function OptionCards<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; icon: IconName; title: string; subtitle: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  const uid = useId();
  return (
    <div className="ds-optioncards" role="radiogroup" aria-label={label}>
      {options.map((o, i) => {
        const subtitleId = `${uid}-${i}`;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={o.value === value}
            aria-label={o.title}
            aria-describedby={subtitleId}
            className="ds-optioncards__item"
            onClick={() => onChange(o.value)}
          >
            <span className="ds-optioncards__icon" aria-hidden="true">
              <Icon name={o.icon} size={22} />
            </span>
            <span className="ds-optioncards__text">
              <b aria-hidden="true">{o.title}</b>
              <small id={subtitleId}>{o.subtitle}</small>
            </span>
            <span className="ds-optioncards__dot" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
