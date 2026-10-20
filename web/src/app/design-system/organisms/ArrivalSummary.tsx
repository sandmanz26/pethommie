import type { Arrival } from "@/app/domain/types";
import { timeOf } from "@/app/domain/logic";
import { Badge } from "@/app/design-system/atoms/Badge";
import { UiIcon } from "@/app/design-system/atoms/UiIcon";
import { Heading, Muted } from "@/app/design-system/atoms/Text";
import { useAppT } from "@/app/i18n/useAppT";
import "./organisms.css";

/** What was recorded when the pet arrived. */
export function ArrivalSummary({ arrival }: { arrival: Arrival | null }) {
  const { t, locale } = useAppT();
  const a = t.arrival;
  return (
    <section className="ds-panel" aria-labelledby="arrival-title">
      <span className="ds-panel__title">
        <UiIcon name="bag" size={28} />
        <Heading level={2} size="md">
          <span id="arrival-title">{a.title}</span>
        </Heading>
      </span>
      {arrival ? (
        <>
          <Muted>{a.recorded(timeOf(arrival.at, locale))}</Muted>
          <dl className="ds-facts">
            <dt>{a.healthyShort}</dt>
            <dd>
              <Badge tone={arrival.healthy ? "ok" : "warn"}>{arrival.healthy ? a.ok : a.attention}</Badge>
            </dd>
            <dt>{a.fleaShort}</dt>
            <dd>
              <Badge tone={arrival.fleaFree ? "ok" : "warn"}>{arrival.fleaFree ? a.notSeen : a.found}</Badge>
            </dd>
            {arrival.weightKg !== null && (
              <>
                <dt>{a.weight}</dt>
                <dd>{arrival.weightKg} kg</dd>
              </>
            )}
            {arrival.belongings && (
              <>
                <dt>{a.belongings}</dt>
                <dd>{arrival.belongings}</dd>
              </>
            )}
            {arrival.food && (
              <>
                <dt>{a.food}</dt>
                <dd>{arrival.food}</dd>
              </>
            )}
            {arrival.notes && (
              <>
                <dt>{a.notes}</dt>
                <dd>{arrival.notes}</dd>
              </>
            )}
          </dl>
        </>
      ) : (
        <Muted>{a.none}</Muted>
      )}
    </section>
  );
}
