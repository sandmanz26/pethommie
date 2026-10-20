import { useState } from "react";
import type { Booking } from "@/app/domain/types";
import { petNames } from "@/app/domain/invoices";
import { addDays, formatDate, holdsCage, stayPetIds, todayBoard, todayISO, vaccineState } from "@/app/domain/logic";
import { stayingToday } from "@/app/domain/careLog";
import { useStore } from "@/app/store/AppStore";
import { useAppT } from "@/app/i18n/useAppT";
import { Button } from "@/app/design-system/atoms/Button";
import { Badge } from "@/app/design-system/atoms/Badge";
import { Heading, Muted } from "@/app/design-system/atoms/Text";
import { EmptyState } from "@/app/design-system/molecules/EmptyState";
import { StatCard } from "@/app/design-system/molecules/StatCard";
import { BookingCard } from "@/app/design-system/organisms/BookingCard";
import { FirstSteps } from "@/app/design-system/organisms/FirstSteps";
import { PageHeader } from "@/app/design-system/organisms/PageHeader";
import { StayingRow } from "@/app/design-system/organisms/StayingRow";
import { useCheckOut } from "./useCheckOut";
import "./pages.css";

export function TodayPage() {
  const { data } = useStore();
  const checkOut = useCheckOut();
  const { t, locale } = useAppT();
  const [today] = useState(todayISO);
  const board = todayBoard(data, today);
  const hotel = data.hotel!;

  const card = (b: Booking, action: "in" | "out") => (
    <BookingCard
      key={b.id}
      booking={b}
      pet={data.pets.find((p) => p.id === b.petId)}
      names={petNames(data, b)}
      owner={data.owners.find((o) => o.id === data.pets.find((p) => p.id === b.petId)?.ownerId)}
      cage={data.cages.find((c) => c.id === b.cageId)}
      checkInTo={action === "in" ? `/app/bookings/${b.id}#checkin` : undefined}
      onCheckOut={action === "out" ? () => checkOut.request(b) : undefined}
    />
  );

  // Vaccine alerts for pets staying now or arriving in the next 7 days.
  const alertPetIds = new Set(
    data.bookings.filter((b) => holdsCage(b) && b.checkIn <= addDays(today, 7)).flatMap(stayPetIds),
  );
  const alerts = data.pets
    .filter((p) => alertPetIds.has(p.id))
    .map((p) => ({ pet: p, state: vaccineState(p, today) }))
    .filter((a) => a.state === "expired" || a.state === "soon");

  const staying = stayingToday(data, today);
  const stepsDone = [
    data.bookings.length > 0,
    data.bookings.some((b) => b.status === "checked_in" || b.status === "checked_out"),
    data.careLog.length > 0,
    data.reportsSent.length > 0,
  ];
  const nextBooking = data.bookings.find((b) => b.status === "booked") ?? data.bookings[0];
  const stepLinks = ["/app/bookings/new", nextBooking ? `/app/bookings/${nextBooking.id}#checkin` : "/app/bookings/new", staying[0] ? `/app/bookings/${staying[0].booking.id}#care` : "/app/bookings", staying[0] ? `/app/bookings/${staying[0].booking.id}#care` : "/app/bookings"];

  const dateLabel = new Date().toLocaleDateString(locale === "id" ? "id-ID" : "en-GB", { weekday: "long", day: "numeric", month: "long" });

  return (
    <>
      <PageHeader art="app-welcome"
        title={t.today.title}
        lead={`${dateLabel} · ${hotel.name}`}
        actions={
          <Button to="/app/bookings/new" icon="plus">
            {t.nav.newBooking}
          </Button>
        }
      />

      {!stepsDone.every(Boolean) && <FirstSteps done={stepsDone} links={stepLinks} />}

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
          {board.arriving.length ? board.arriving.map((b) => card(b, "in")) : !board.lateArrivals.length && <EmptyState art="feature-calendar">{t.today.emptyArrivals}</EmptyState>}
        </section>

        <section className="pg-section">
          <Heading level={2} size="md">{t.today.departures}</Heading>
          {board.leaving.length ? board.leaving.map((b) => card(b, "out")) : <EmptyState art="app-closed">{t.today.emptyDepartures}</EmptyState>}
        </section>
      </div>

      <section className="pg-section">
        <Heading level={2} size="md">{t.stayingNow.title}</Heading>
        {staying.length ? (
          staying.map(({ booking, entries, reportSent }) => (
            <StayingRow key={booking.id} booking={booking} pet={data.pets.find((p) => p.id === booking.petId)} names={petNames(data, booking)} today={today} entries={entries} reportSent={reportSent} />
          ))
        ) : (
          <EmptyState art="app-cage">{t.stayingNow.empty}</EmptyState>
        )}
      </section>

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
      {checkOut.dialog}
    </>
  );
}
