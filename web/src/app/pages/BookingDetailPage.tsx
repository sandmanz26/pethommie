import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { dayOf, formatDate, nights, todayISO } from "@/app/domain/logic";
import { petNames } from "@/app/domain/invoices";
import { entriesOn, reportWasSent } from "@/app/domain/careLog";
import { useMode } from "@/app/mode/ModeProvider";
import { useStore } from "@/app/store/AppStore";
import { useAppT } from "@/app/i18n/useAppT";
import { Badge, type Tone } from "@/app/design-system/atoms/Badge";
import { Button } from "@/app/design-system/atoms/Button";
import { Muted } from "@/app/design-system/atoms/Text";
import { ConfirmDialog } from "@/app/design-system/molecules/ConfirmDialog";
import { EmptyState } from "@/app/design-system/molecules/EmptyState";
import { ArrivalSummary } from "@/app/design-system/organisms/ArrivalSummary";
import { BookingEditForm } from "@/app/design-system/organisms/BookingEditForm";
import { ChargesPanel } from "@/app/design-system/organisms/ChargesPanel";
import { CareLogPanel } from "@/app/design-system/organisms/CareLogPanel";
import { CheckInForm } from "@/app/design-system/organisms/CheckInForm";
import { InvoicePanel } from "@/app/design-system/organisms/InvoicePanel";
import { MessagesPanel } from "@/app/design-system/organisms/MessagesPanel";
import { PageHeader } from "@/app/design-system/organisms/PageHeader";
import { PaymentsPanel } from "@/app/design-system/organisms/PaymentsPanel";
import { ReportPanel } from "@/app/design-system/organisms/ReportPanel";
import { formatWhatsapp } from "@/shared/lib/phone";
import { useCheckOut } from "./useCheckOut";
import "./pages.css";

const statusTone: Record<string, Tone> = { booked: "info", checked_in: "ok", checked_out: "neutral", cancelled: "danger" };

/** One stay in full: check-in record, payments, daily care log, the report for the owner, and messages. */
export function BookingDetailPage() {
  const { id = "" } = useParams();
  const { hash } = useLocation();
  const store = useStore();
  const { data } = store;
  const { t, locale } = useAppT();
  const { advanced } = useMode();
  const [today] = useState(todayISO);
  const [editing, setEditing] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const checkOut = useCheckOut();

  const booking = data.bookings.find((b) => b.id === id);

  // Jump to the part of the page a link pointed at (#checkin, #care).
  useEffect(() => {
    if (booking && hash) document.getElementById(hash.slice(1))?.scrollIntoView?.();
  }, [booking, hash]);

  const careDays = useMemo(() => {
    const dates = [...new Set(data.careLog.filter((e) => e.bookingId === id).map((e) => dayOf(e.at)))].sort().reverse();
    return dates.filter((d) => d !== today).map((date) => ({ date, entries: entriesOn(data, id, date) }));
  }, [data, id, today]);

  if (!booking || !data.hotel) {
    return (
      <>
        <PageHeader title={t.bookingDetail.title} back={{ to: "/app/bookings", label: t.common.back }} />
        <EmptyState icon="bookings">{t.bookingDetail.notFound}</EmptyState>
      </>
    );
  }

  const d = t.bookingDetail;
  const pet = data.pets.find((p) => p.id === booking.petId);
  const owner = data.owners.find((o) => o.id === pet?.ownerId);
  const cage = data.cages.find((c) => c.id === booking.cageId);
  const names = petNames(data, booking);
  const hotel = data.hotel;
  const staying = booking.status === "checked_in";
  const sentAt = data.reportsSent.find((r) => r.bookingId === id && r.date === today)?.at ?? null;
  const editable = booking.status === "booked" || staying;

  return (
    <>
      <PageHeader
        title={names || "—"}
        lead={[owner?.name, owner?.whatsapp && formatWhatsapp(owner.whatsapp)].filter(Boolean).join(" · ")}
        back={{ to: "/app/bookings", label: t.common.back }}
        actions={
          <>
            {pet && <Button to={`/app/pets/${pet.id}`} variant="ghost" icon="pets">{d.petPage}</Button>}
            {editable && !editing && <Button variant="secondary" icon="edit" onClick={() => setEditing(true)}>{d.edit}</Button>}
            {staying && <Button variant="secondary" icon="logout" onClick={() => checkOut.request(booking)}>{t.bookings.checkOut}</Button>}
            {booking.status === "booked" && <Button variant="ghost" icon="x" onClick={() => setConfirmCancel(true)}>{t.bookings.cancelBooking}</Button>}
          </>
        }
      />

      <section className="pg-summary" aria-label={d.stay}>
        <Badge tone={statusTone[booking.status]}>{t.bookings.status[booking.status]}</Badge>
        <span>
          <b>{cage?.name ?? "—"}</b> · {formatDate(booking.checkIn, locale, { day: "numeric", month: "short" })} → {formatDate(booking.checkOut, locale, { day: "numeric", month: "short", year: "numeric" })} · {t.common.nights(nights(booking.checkIn, booking.checkOut))}
        </span>
        {booking.notes && <Muted>{booking.notes}</Muted>}
      </section>

      {editing && (
        <BookingEditForm
          data={data}
          booking={booking}
          onSave={(patch) => {
            const issues = store.editBooking(booking.id, patch);
            if (!issues.length) setEditing(false);
            return issues;
          }}
          onCancel={() => setEditing(false)}
        />
      )}

      <div className="pg-columns">
        <div className="pg-section">
          {booking.status === "booked" && (
            <div id="checkin">
              <CheckInForm compact={!advanced} onSubmit={(arrival) => store.checkIn(booking.id, arrival)} />
            </div>
          )}
          {(staying || booking.status === "checked_out") && <ArrivalSummary arrival={booking.arrival} />}
          {advanced && booking.status !== "cancelled" && (
            <ChargesPanel
              booking={booking}
              cage={cage}
              onAdd={editable ? (charge) => store.addCharge(booking.id, charge) : undefined}
              onRemove={editable ? (chargeId) => store.removeCharge(booking.id, chargeId) : undefined}
            />
          )}
          <PaymentsPanel
            simple={!advanced}
            booking={booking}
            cage={cage}
            onAdd={booking.status === "cancelled" ? undefined : (payment) => store.recordPayment(booking.id, payment)}
            onRemove={booking.status === "cancelled" ? undefined : (paymentId) => store.removePayment(booking.id, paymentId)}
          />
          {advanced && booking.status !== "cancelled" && <InvoicePanel data={data} booking={booking} onIssue={(request) => store.issueInvoice(booking.id, request)} />}
          {advanced && pet && <MessagesPanel hotel={hotel} booking={booking} pet={pet} petName={names} owner={owner} cage={cage} />}
        </div>

        {(staying || booking.status === "checked_out") && (
          <div className="pg-section" id="care">
            <CareLogPanel
              simple={!advanced}
              today={today}
              checkIn={booking.checkIn}
              active={staying}
              entries={entriesOn(data, booking.id, today)}
              earlier={careDays}
              onAdd={(entry) => store.recordCare({ ...entry, bookingId: booking.id })}
              onRemove={store.removeCare}
            />
            {staying && pet && (
              <ReportPanel
                hotel={hotel}
                booking={booking}
                pet={pet}
                owner={owner}
                petName={names}
                date={today}
                entries={entriesOn(data, booking.id, today)}
                sentAt={reportWasSent(data, booking.id, today) ? sentAt : null}
                onSent={() => store.markReportSent(booking.id, today, new Date().toISOString())}
              />
            )}
          </div>
        )}
      </div>

      {checkOut.dialog}
      <ConfirmDialog
        open={confirmCancel}
        message={t.bookings.confirmCancel}
        confirmLabel={t.bookings.cancelBooking}
        cancelLabel={t.bookings.keep}
        danger
        onCancel={() => setConfirmCancel(false)}
        onConfirm={() => {
          store.setBookingStatus(booking.id, "cancelled");
          setConfirmCancel(false);
        }}
      />
    </>
  );
}
