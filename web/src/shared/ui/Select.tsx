import { Children, isValidElement, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactElement, type ReactNode } from "react";
import "./select.css";

type Option = { value: string; label: ReactNode; text: string; disabled: boolean };
type OptionProps = { value?: string | number; children?: ReactNode; disabled?: boolean };

const textOf = (node: ReactNode): string =>
  Children.toArray(node)
    .map((c) => (typeof c === "string" || typeof c === "number" ? String(c) : isValidElement<{ children?: ReactNode }>(c) ? textOf(c.props.children) : ""))
    .join("");

/** The <option> elements among the children, fragments and arrays flattened. */
function optionsOf(children: ReactNode): Option[] {
  const out: Option[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === "option") {
      const p = (child as ReactElement<OptionProps>).props;
      const text = textOf(p.children);
      out.push({ value: String(p.value ?? text), label: p.children, text, disabled: Boolean(p.disabled) });
    } else {
      out.push(...optionsOf((child as ReactElement<{ children?: ReactNode }>).props.children));
    }
  });
  return out;
}

export type SelectProps = {
  id?: string;
  value: string | number;
  /** Called like a native select's change: `e.target.value` is the chosen option's value, as a string. */
  onChange?: (e: { target: { value: string } }) => void;
  children: ReactNode;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  "aria-describedby"?: string;
  "aria-label"?: string;
};

/**
 * A dropdown drawn by us instead of the browser's: a button that opens a list of the <option>s given as children.
 * Keyboard as a native select (arrows, Home/End, Enter/Space, Escape, typing the start of an option), labelled by
 * the <label for> pointing at it, and it opens upwards when there is no room below.
 */
export function Select({ id, value, onChange, children, disabled, invalid, className = "", "aria-describedby": describedBy, "aria-label": ariaLabel }: SelectProps) {
  const options = useMemo(() => optionsOf(children), [children]);
  const current = String(value);
  const selectedIndex = options.findIndex((o) => o.value === current);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [up, setUp] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: "", at: 0 });
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  useEffect(() => {
    if (!open || active < 0) return;
    list.current?.children[active]?.scrollIntoView?.({ block: "nearest" });
  }, [open, active]);

  const enabled = (i: number) => i >= 0 && i < options.length && !options[i].disabled;
  const step = (from: number, dir: 1 | -1) => {
    for (let i = from + dir; i >= 0 && i < options.length; i += dir) if (enabled(i)) return i;
    return from;
  };

  function show() {
    if (disabled) return;
    const box = button.current?.getBoundingClientRect();
    if (box) {
      const below = window.innerHeight - box.bottom;
      setUp(below < 280 && box.top > below);
    }
    setActive(selectedIndex >= 0 ? selectedIndex : step(-1, 1));
    setOpen(true);
  }

  function choose(i: number) {
    if (!enabled(i)) return;
    setOpen(false);
    button.current?.focus();
    if (options[i].value !== current) onChange?.({ target: { value: options[i].value } });
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    const key = e.key;
    if (key === "ArrowDown" || key === "ArrowUp") {
      e.preventDefault();
      if (!open) return show();
      setActive((a) => step(a, key === "ArrowDown" ? 1 : -1));
    } else if (key === "Home" || key === "End") {
      if (!open) return;
      e.preventDefault();
      setActive(key === "Home" ? step(-1, 1) : step(options.length, -1));
    } else if (key === "Enter" || key === " ") {
      e.preventDefault();
      if (open) choose(active);
      else show();
    } else if (key === "Escape") {
      if (open) {
        e.preventDefault();
        setOpen(false);
      }
    } else if (key === "Tab") {
      setOpen(false);
    } else if (key.length === 1 && /\S/.test(key)) {
      const now = Date.now();
      typed.current = { text: (now - typed.current.at < 700 ? typed.current.text : "") + key.toLowerCase(), at: now };
      const from = open ? active : selectedIndex;
      const order = [...options.keys()].map((k) => (k + Math.max(0, from) + (typed.current.text.length === 1 ? 1 : 0)) % options.length);
      const hit = order.find((i) => enabled(i) && options[i].text.toLowerCase().startsWith(typed.current.text));
      if (hit === undefined) return;
      if (open) setActive(hit);
      else if (options[hit].value !== current) onChange?.({ target: { value: options[hit].value } });
    }
  }

  return (
    <div ref={root} className={`ui-select${open ? " is-open" : ""}${up ? " is-up" : ""} ${className}`}>
      <button
        ref={button}
        id={id}
        type="button"
        data-value={current}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        aria-label={ariaLabel}
        disabled={disabled}
        className="ds-control ui-select__button"
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKeyDown}
      >
        <span className="ui-select__value">{selectedIndex >= 0 ? options[selectedIndex].label : "—"}</span>
        <svg className="ui-select__chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <ul ref={list} id={listId} role="listbox" aria-label={ariaLabel} className="ui-select__list" tabIndex={-1}>
          {options.map((o, i) => (
            <li
              key={`${o.value}-${i}`}
              id={`${listId}-${i}`}
              role="option"
              data-value={o.value}
              aria-selected={o.value === current}
              aria-disabled={o.disabled || undefined}
              className={`ui-select__option${i === active ? " is-active" : ""}`}
              onPointerDown={(e) => e.preventDefault()}
              onPointerEnter={() => enabled(i) && setActive(i)}
              onClick={(e) => {
                // Inside a <label>, a click would otherwise also press the button and open the list again.
                e.preventDefault();
                choose(i);
              }}
            >
              <span>{o.label}</span>
              {o.value === current && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
