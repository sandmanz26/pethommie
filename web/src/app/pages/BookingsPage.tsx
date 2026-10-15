import { useMemo, useState } from "react";
import type { Booking } from "@/app/domain/types";
import { todayISO } from "@/app/domain/logic";
import { useStore } from "@/app/store/AppStore";
import { useAppT } from "@/app/i18n/useAppT";
import { Button } from "@/app/design-system/atoms/Button";
import { ConfirmDialog } from "@/app/design-system/molecules/ConfirmDialog";
import { EmptyState } from "@/app/design-system/molecules/EmptyState";
import { Segmented } from "@/app/design-system/molecules/Segmented";
import { BookingCard } from "@/app/design-system/organisms/BookingCard";
import { PageHeader } from "@/app/design-system/organisms/PageHeader";
import "./pages.css";

type Filter = "upcoming" | "inHouse" | "past";

export function BookingsPage() {
  const { data, setBookingStatus } = useStore();
  const { t } = useAppT();
  const [filter, setFilter] = useState<Filter>("upcoming");
  const [cancelId, setCancelId] = useState<string | null>(null);
  const today = todayISO();

  const groups = useMemo(() => {
    const byDate = (a: Booking, b: Booking) => a.checkIn.localeCompare(b.checkIn);
    return {
      upcoming: data.bookings.filter((b) => b.status === "booked").sort(byDate),
      inHouse: data.bookings.filter((b) => b.status === "checked_in").sort((a, b) => a.checkOut.localeCompare(b.checkOut)),
      past: data.bookings.filter((b) => b.status === "checked_out" || b.status === "cancelled").sort((a, b) => -byDate(a, b)),
    };
  }, [data.bookings]);

  const list = groups[filter];

  return (
    <>
      <PageHeader
        title={t.bookings.title}
        actions={
          <Button to="/app/bookings/new" icon="plus">
            {t.nav.newBooking}
          </Button>
        }
      />
      <Segmented<Filter>
        label={t.bookings.title}
        value={filter}
        onChange={setFilter}
        options={[
          { value: "upcoming", label: t.bookings.filters.upcoming, count: groups.upcoming.length },
          { value: "inHouse", label: t.bookings.filters.inHouse, count: groups.inHouse.length },
          { value: "past", label: t.bookings.filters.past, count: groups.past.length },
        ]}
      />
      <div className="pg-list">
        {list.length ? (
          list.map((b) => {
            const pet = data.pets.find((p) => p.id === b.petId);
            return (
              <BookingCard
                key={b.id}
                booking={b}
                pet={pet}
                owner={data.owners.find((o) => o.id === pet?.ownerId)}
                cage={data.cages.find((c) => c.id === b.cageId)}
                onCheckIn={b.status === "booked" && b.checkIn <= today ? () => setBookingStatus(b.id, "checked_in") : undefined}
                onCheckOut={b.status === "checked_in" ? () => setBookingStatus(b.id, "checked_out") : undefined}
                onCancel={b.status === "booked" ? () => setCancelId(b.id) : undefined}
              />
            );
          })
        ) : (
          <EmptyState
            icon="bookings"
            action={
              filter === "upcoming" && (
                <Button to="/app/bookings/new" icon="plus" size="sm">
                  {t.bookings.emptyCta}
                </Button>
              )
            }
          >
            {t.bookings.empty}
          </EmptyState>
        )}
      </div>
      <ConfirmDialog
        open={cancelId !== null}
        message={t.bookings.confirmCancel}
        confirmLabel={t.bookings.cancelBooking}
        cancelLabel={t.bookings.keep}
        danger
        onCancel={() => setCancelId(null)}
        onConfirm={() => {
          if (cancelId) setBookingStatus(cancelId, "cancelled");
          setCancelId(null);
        }}
      />
    </>
  );
}
