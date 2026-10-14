import "./molecules.css";

/** Pick one of a few views (e.g. Upcoming / Staying / Past). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="ds-segmented" role="tablist" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          className="ds-segmented__item"
          onClick={() => onChange(o.value)}
        >
          {o.label}
          {o.count !== undefined && <span className="ds-segmented__count">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}
