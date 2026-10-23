import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/app/design-system/atoms/Button";
import "./molecules.css";

const focusable = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * A panel that slides in from the right (a sheet from the bottom on a phone) over the page. Modal: focus moves into
 * it and stays there, Escape or the close button or a tap outside closes it, and focus returns where it was.
 */
export function Drawer({ title, closeLabel, onClose, children }: { title: ReactNode; closeLabel: string; onClose: () => void; children: ReactNode }) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const back = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>(".ds-drawer__close")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close.current();
        return;
      }
      if (e.key !== "Tab" || !panel.current) return;
      const items = [...panel.current.querySelectorAll<HTMLElement>(focusable)];
      if (!items.length) return;
      const [first, last] = [items[0], items[items.length - 1]];
      const inside = panel.current.contains(document.activeElement);
      const to = !inside ? first : e.shiftKey && document.activeElement === first ? last : !e.shiftKey && document.activeElement === last ? first : null;
      if (to) {
        e.preventDefault();
        to.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (back?.isConnected) back.focus();
    };
  }, []);

  return createPortal(
    <div className="ds-drawer">
      <div className="ds-drawer__scrim" onClick={onClose} aria-hidden="true" />
      <div ref={panel} className="ds-drawer__panel" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="ds-drawer__head">
          <h2 id={titleId}>{title}</h2>
          <Button className="ds-drawer__close" variant="ghost" size="sm" icon="x" aria-label={closeLabel} onClick={onClose} />
        </div>
        <div className="ds-drawer__body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
