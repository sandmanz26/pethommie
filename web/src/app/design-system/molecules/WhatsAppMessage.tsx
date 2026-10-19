import { useId, useState, type ReactNode } from "react";
import { Button } from "@/app/design-system/atoms/Button";
import { Icon } from "@/app/design-system/atoms/Icon";
import { Textarea } from "@/app/design-system/atoms/Input";
import { waLink } from "@/app/domain/messages";
import "./molecules.css";

/**
 * A ready-made WhatsApp message: edit it if you like, then open WhatsApp with it filled in (nothing is
 * sent until you press send there), or copy the text. `onOpen` lets the caller note that it went out.
 */
export function WhatsAppMessage({
  text,
  whatsapp,
  label,
  openLabel,
  resendLabel,
  copyLabel,
  copiedLabel,
  opened,
  hideLabel,
  status,
  onOpen,
}: {
  text: string;
  whatsapp: string;
  label: string;
  openLabel: string;
  resendLabel?: string;
  copyLabel: string;
  copiedLabel: string;
  /** True once it has been sent before: the button then reads `resendLabel`. */
  opened?: boolean;
  /** The label is already on screen as a heading; keep it for screen readers only. */
  hideLabel?: boolean;
  status?: ReactNode;
  onOpen?: () => void;
}) {
  const id = useId();
  const [custom, setCustom] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const message = custom ?? text;

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the text is on screen to select by hand.
    }
  }

  return (
    <div className="ds-wa">
      <label className={hideLabel ? "ds-sr" : "ds-field__label"} htmlFor={id}>
        {label}
      </label>
      <Textarea id={id} value={message} onChange={(e) => setCustom(e.target.value)} rows={Math.min(14, message.split("\n").length + 1)} />
      {status}
      <div className="ds-wa__actions">
        <a className="ds-btn ds-btn--primary" href={waLink(whatsapp, message)} target="_blank" rel="noopener noreferrer" onClick={onOpen}>
          <Icon name="whatsapp" size={18} />
          <span>{opened && resendLabel ? resendLabel : openLabel}</span>
        </a>
        <Button variant="secondary" icon="copy" onClick={copy}>
          {copied ? copiedLabel : copyLabel}
        </Button>
      </div>
    </div>
  );
}
