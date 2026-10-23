import { forwardRef, useLayoutEffect, useRef, type ChangeEvent, type InputHTMLAttributes } from "react";
import { Input } from "./Input";
import { groupDigits } from "./money";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "type" | "inputMode"> & { value: string | number; invalid?: boolean };

/**
 * A rupiah amount that groups its thousands while you type: 1500000 shows as 1.500.000. The change handler gets the
 * grouped text (every money rule here reads "75.000" as 75000), and the cursor stays after the digit just typed.
 */
export const MoneyInput = forwardRef<HTMLInputElement, Props>(function MoneyInput({ value, onChange, ...rest }, outer) {
  const inner = useRef<HTMLInputElement | null>(null);
  // Digits to the left of the cursor after the last edit, to put the cursor back after regrouping.
  const caret = useRef<number | null>(null);
  const shown = groupDigits(String(value ?? ""));

  useLayoutEffect(() => {
    const el = inner.current;
    if (!el || caret.current === null || document.activeElement !== el) return;
    let digits = caret.current;
    let pos = 0;
    while (pos < shown.length && digits > 0) {
      if (/\d/.test(shown[pos])) digits--;
      pos++;
    }
    el.setSelectionRange(pos, pos);
    caret.current = null;
  }, [shown]);

  function change(e: ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    caret.current = raw.slice(0, e.target.selectionStart ?? raw.length).replace(/\D/g, "").length;
    e.target.value = groupDigits(raw);
    onChange?.(e);
  }

  return (
    <Input
      {...rest}
      ref={(el) => {
        inner.current = el;
        if (typeof outer === "function") outer(el);
        else if (outer) outer.current = el;
      }}
      inputMode="numeric"
      autoComplete="off"
      value={shown}
      onChange={change}
    />
  );
});
