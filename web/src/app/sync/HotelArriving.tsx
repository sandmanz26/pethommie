import { Button } from "@/app/design-system/atoms/Button";
import { Illustration } from "@/app/design-system/atoms/Illustration";
import { Heading, Muted } from "@/app/design-system/atoms/Text";
import { FocusLayout } from "@/app/design-system/templates/FocusLayout";
import { useAppT } from "@/app/i18n/useAppT";
import { useSync } from "./SyncContext";
import type { Arrival } from "./syncedRepository";

/**
 * A synced hotel that isn't on this device yet. Shown instead of onboarding until the server has answered, so a second
 * device never sets up a second hotel. Offline on a first sign-in: say a connection is needed, and offer to try again.
 */
export function HotelArriving({ arrival, onSignOut }: { arrival: Extract<Arrival, "waiting" | "unreachable">; onSignOut: () => void }) {
  const { t } = useAppT();
  const { status, retry } = useSync();
  const a = t.sync.arriving;
  if (arrival === "waiting") {
    return (
      <FocusLayout>
        <div className="pg-flow" role="status" aria-live="polite">
          <Illustration name="app-hotel" height={140} />
          <div className="pg-flow__head pg-flow__head--center">
            <Heading level={1}>{a.loading}</Heading>
            <Muted>{a.loadingLead}</Muted>
          </div>
        </div>
      </FocusLayout>
    );
  }
  const offline = status?.state !== "conflict";
  return (
    <FocusLayout>
      <div className="pg-flow" data-arrival="unreachable">
        <Illustration name="app-closed" height={140} />
        <div className="pg-flow__head pg-flow__head--center">
          <Heading level={1}>{offline ? a.offlineTitle : a.failedTitle}</Heading>
          <Muted>{offline ? a.offlineLead : a.failedLead}</Muted>
        </div>
        <div className="pg-flow__actions">
          <Button variant="secondary" onClick={onSignOut}>
            {a.signOut}
          </Button>
          <Button size="lg" icon="chevronRight" onClick={retry}>
            {t.sync.retry}
          </Button>
        </div>
      </div>
    </FocusLayout>
  );
}
