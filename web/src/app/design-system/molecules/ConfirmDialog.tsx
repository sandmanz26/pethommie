import { useEffect, useRef } from "react";
import { Button } from "@/app/design-system/atoms/Button";
import "./molecules.css";

/** In-page confirmation (window.confirm is blocked in some embeds and looks out of place). */
export function ConfirmDialog({
  open,
  message,
  confirmLabel,
  cancelLabel,
  danger,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal?.();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className="ds-dialog" onCancel={(e) => (e.preventDefault(), onCancel())}>
      <p>{message}</p>
      <div className="ds-dialog__actions">
        <Button variant="secondary" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} autoFocus>
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
