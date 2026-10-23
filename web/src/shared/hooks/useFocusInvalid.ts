import { useEffect, useRef } from "react";

/**
 * Moves focus to the first invalid control after a failed submit. Attach `ref` to the form and call `focusInvalid()`
 * when the submit found errors: once the errors render, the first `[aria-invalid="true"]` control gets focus.
 */
export function useFocusInvalid<T extends HTMLElement = HTMLFormElement>() {
  const ref = useRef<T>(null);
  const pending = useRef(false);
  useEffect(() => {
    if (!pending.current) return;
    pending.current = false;
    ref.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  });
  return { ref, focusInvalid: () => (pending.current = true) };
}
