import { useState } from "react";
import type { Booking } from "../domain/types";
import { addDays, formatDate, holdsCage, todayBoard, todayISO, vaccineState } from "../domain/logic";
import { useStore } from "../store/AppStore";
import { useAppT } from "../i18n/useAppT";
import { Button } from "../design-system/atoms/Button";
import { Badge } from "../design-system/atoms/Badge";
import { Heading, Muted } from "../design-system/atoms/Text";
import { EmptyState } from "../design-system/molecules/EmptyState";
import { StatCard } from "../design-system/molecules/StatCard";
import { BookingCard } from "../design-system/organisms/BookingCard";
import { PageHeader } from "../design-system/organisms/PageHeader";
import "./pages.css";

export function TodayPage() {
  const { data, setBookingStatus } = useStore();
  const { t, locale } = useAppT();
  const [today] = useState(todayISO);
  const board = todayBoard(data, today);
  const hotel = data.hotel!;

  const card = (b: Booking, action: "in" | "out") => (
    <BookingCard
      key={b.id}
      booking={b}
      pet={data.pets.find((p) => p.id === b.petId)}
      owner={data.owners.find((o) => o.id === data.pets.find((p) => p.id === b.petId)?.ownerId)}
      cage={data.cages.find((c) => c.id === b.cageId)}
      onCheckIn={action === "in" ? () => setBookingStatus(b.id, "checked_in") : undefined}
      onCheckOut={action === "out" ? () => setBookingStatus(b.id, "checked_out") : undefined}
    />
  );

  // Vaccine alerts for pets staying now or arriving in the next 7 days.
  const alertPetIds = new Set(
    data.bookings.filter((b) => holdsCage(b) && b.checkIn <= addDays(today, 7)).map((b) => b.petId),
  );
  const alerts = data.pets
    .filter((p) => alertPetIds.has(p.id))
    .map((p) => ({ pet: p, state: vaccineState(p, today) }))
    .filter((a) => a.state === "expired" || a.state === "soon");

  const dateLabel = new Date().toLocaleDateString(locale === "id" ? "id-ID" : "en-GB", { weekday: "long", day: "numeric", month: "long" });

  return (
    <>
      <PageHeader
        title={t.today.title}
        lead={`${dateLabel} · ${hotel.name}`}
        actions={
          <Button to="/app/bookings/new" icon="plus">
            {t.nav.newBooking}
          </Button>
        }
      />

      <div className="pg-stats">
        <StatCard label={t.today.stats.inHouse} value={board.inHouse.length} tone="ok" />
        <StatCard label={t.today.stats.arriving} value={board.arriving.length + board.lateArrivals.length} tone="info" />
        <StatCard label={t.today.stats.leaving} value={board.leaving.length} tone="warn" />
        <StatCard label={t.today.stats.free} value={`${board.freeTonight}/${data.cages.length}`} tone="brand" />
      </div>

      <div className="pg-columns">
        <section className="pg-section">
          <Heading level={2} size="md">{t.today.arrivals}</Heading>
          {board.lateArrivals.length > 0 && (
            <>
              <Badge tone="warn">{t.today.late}</Badge>
              {board.lateArrivals.map((b) => card(b, "in"))}
            </>
          )}
          {board.arriving.length ? board.arriving.map((b) => card(b, "in")) : !board.lateArrivals.length && <EmptyState icon="login">{t.today.emptyArrivals}</EmptyState>}
        </section>

        <section className="pg-section">
          <Heading level={2} size="md">{t.today.departures}</Heading>
          {board.leaving.length ? board.leaving.map((b) => card(b, "out")) : <EmptyState icon="logout">{t.today.emptyDepartures}</EmptyState>}
        </section>
      </div>

      <section className="pg-section">
        <Heading level={2} size="md">{t.today.vaccine}</Heading>
        <Muted>{t.today.vaccineLead}</Muted>
        {alerts.length ? (
          <ul className="pg-alerts">
            {alerts.map(({ pet, state }) => (
              <li key={pet.id}>
                <b>{pet.name}</b>
                <span>{formatDate(pet.vaccineExpiry, locale)}</span>
                <Badge tone={state === "expired" ? "danger" : "warn"}>{t.pets.vaccine[state]}</Badge>
                <Button to={`/app/pets/${pet.id}`} variant="ghost" size="sm" icon="edit" aria-label={`${t.common.edit} ${pet.name}`} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon="check">{t.today.noAlerts}</EmptyState>
        )}
      </section>
    </>
  );
}
