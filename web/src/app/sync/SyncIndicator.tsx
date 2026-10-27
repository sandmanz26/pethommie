import { Link } from "react-router-dom";
import { Badge } from "@/app/design-system/atoms/Badge";
import { Button } from "@/app/design-system/atoms/Button";
import { Alert } from "@/app/design-system/molecules/Alert";
import { useAppT } from "@/app/i18n/useAppT";
import { useSync } from "./SyncContext";

/** A small line saying whether the hotel is on the server. Renders nothing for a hotel that isn't synced. */
export function SyncIndicator() {
  const { status, retry } = useSync();
  const { t } = useAppT();
  if (!status) return null;
  if (status.state === "conflict") {
    return (
      <Alert tone="danger">
        {t.sync.conflict[status.reason]}{" "}
        {status.booking && <Link to={`/app/bookings/${status.booking}`}>{t.sync.openStay}</Link>}{" "}
        <Button size="sm" variant="ghost" onClick={retry}>{t.sync.retry}</Button>
      </Alert>
    );
  }
  const badge = { synced: ["ok", t.sync.synced], pending: ["neutral", t.sync.pending], offline: ["warn", t.sync.offline] } as const;
  const [tone, text] = badge[status.state];
  return (
    <p className="tpl-app__sync" data-sync={status.state}>
      <Badge tone={tone}>{text}</Badge>
    </p>
  );
}
