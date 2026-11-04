import { useEffect, useRef, useState } from "react";
import { Button } from "@/app/design-system/atoms/Button";
import { Input } from "@/app/design-system/atoms/Input";
import { Field } from "@/app/design-system/molecules/Field";
import { useAppT } from "@/app/i18n/useAppT";

/**
 * "Delete all data" for a hotel saved online. Two different things, each said plainly:
 *   this device only   the local copy and its unsent changes go; the server and other devices keep the hotel.
 *   everywhere         every row on the server goes, so every device loses it. Typing the hotel's name confirms.
 */
export function DeleteSyncedDialog({
  open,
  hotelName,
  unsent,
  offline,
  onCancel,
  onRemoveHere,
  onDeleteEverywhere,
}: {
  open: boolean;
  hotelName: string;
  /** Changes on this device the server doesn't have yet: lost by removing it here. */
  unsent: number;
  offline: boolean;
  onCancel: () => void;
  onRemoveHere: () => void;
  onDeleteEverywhere: () => void;
}) {
  const { t } = useAppT();
  const r = t.syncReset;
  const ref = useRef<HTMLDialogElement>(null);
  const [typed, setTyped] = useState("");
  const [tried, setTried] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setTyped("");
      setTried(false);
      d.showModal?.();
    }
    if (!open && d.open) d.close();
  }, [open]);

  const matches = typed.trim() === hotelName.trim();

  return (
    <dialog ref={ref} className="ds-dialog ds-dialog--form" aria-labelledby="delete-synced-title" onCancel={(e) => (e.preventDefault(), onCancel())}>
      {open && (
        <div className="ds-flowform">
          <h2 id="delete-synced-title">{r.title}</h2>
          <p className="ds-flowform__note">{r.lead}</p>

          <section className="ds-flowform" aria-labelledby="delete-here-title">
            <h3 className="ds-heading ds-heading--sm" id="delete-here-title">
              {r.deviceTitle}
            </h3>
            <p className="ds-flowform__note">{r.deviceBody}</p>
            {unsent > 0 && <p className="ds-flowform__note is-owed">{r.deviceUnsent(unsent)}</p>}
            <div className="ds-dialog__actions">
              <Button variant="secondary" onClick={onRemoveHere}>
                {r.deviceAction}
              </Button>
            </div>
          </section>

          <section className="ds-flowform" aria-labelledby="delete-everywhere-title">
            <h3 className="ds-heading ds-heading--sm" id="delete-everywhere-title">
              {r.everywhereTitle}
            </h3>
            <p className="ds-flowform__note is-owed">{r.everywhereBody}</p>
            <p className="ds-flowform__note">{r.everywhereInvoices}</p>
            {offline && <p className="ds-flowform__note">{r.everywhereOffline}</p>}
            <Field label={r.typeName(hotelName)} error={tried && !matches ? r.mismatch : undefined}>
              <Input value={typed} autoComplete="off" spellCheck={false} onChange={(e) => (setTyped(e.target.value), setTried(false))} />
            </Field>
            <div className="ds-dialog__actions">
              <Button variant="secondary" onClick={onCancel}>
                {r.cancel}
              </Button>
              <Button variant="danger" icon="trash" aria-disabled={!matches} onClick={() => (matches ? onDeleteEverywhere() : setTried(true))}>
                {r.everywhereAction}
              </Button>
            </div>
          </section>
        </div>
      )}
    </dialog>
  );
}
