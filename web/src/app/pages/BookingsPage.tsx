import { useMemo, useState } from "react";
import type { Booking, BookingSource } from "@/app/domain/types";
import { filterBookings, NO_BOOKING_FILTER, type BookingFilter } from "@/app/domain/filters";
import { hasNoUnits, todayISO, unitLabel } from "@/app/domain/logic";
import { petNames } from "@/app/domain/invoices";
import { useStore } from "@/app/store/AppStore";
import { useAppT } from "@/app/i18n/useAppT";
import { Button } from "@/app/design-system/atoms/Button";
import { EmptyState } from "@/app/design-system/molecules/EmptyState";
import { Segmented } from "@/app/design-system/molecules/Segmented";
import { Select } from "@/app/design-system/atoms/Input";
import { Field } from "@/app/design-system/molecules/Field";
import { FilterBar } from "@/app/design-system/molecules/FilterBar";
import { SearchField } from "@/app/design-system/molecules/SearchField";
import { useMode } from "@/app/mode/ModeProvider";
import { useUnitWords } from "@/app/i18n/useUnitWords";
import { BookingCard } from "@/app/design-system/organisms/BookingCard";
import { PageHeader } from "@/app/design-system/organisms/PageHeader";
import { useCheckOut } from "./useCheckOut";
import { useCancelBooking } from "./useCancelBooking";
import "./pages.css";

type Filter = "upcoming" | "inHouse" | "past";

export function BookingsPage() {
  const { data } = useStore();
  const checkOut = useCheckOut();
  const { t } = useAppT();
  const units = useUnitWords();
  const [filter, setFilter] = useState<Filter>("upcoming");
  const cancel = useCancelBooking();
  const { advanced } = useMode();
  const [f, setF] = useState<BookingFilter>(NO_BOOKING_FILTER);
  const set = (patch: Partial<BookingFilter>) => setF((prev) => ({ ...prev, ...patch }));
  const filtered = JSON.stringify(f) !== JSON.stringify(NO_BOOKING_FILTER);
  const today = todayISO();

  const groups = useMemo(() => {
    const byDate = (a: Booking, b: Booking) => a.checkIn.localeCompare(b.checkIn);
    const matching = filterBookings(data, data.bookings, f);
    return {
      upcoming: matching.filter((b) => b.status === "booked").sort(byDate),
      inHouse: matching.filter((b) => b.status === "checked_in").sort((a, b) => a.checkOut.localeCompare(b.checkOut)),
      past: matching.filter((b) => b.status === "checked_out" || b.status === "cancelled").sort((a, b) => -byDate(a, b)),
    };
  }, [data, f]);

  const list = groups[filter];

  return (
    <>
      <PageHeader art="feature-calendar"
        title={t.bookings.title}
        actions={
          <Button to="/app/bookings/new" icon="plus">
            {t.nav.newBooking}
          </Button>
        }
      />
      {data.bookings.length > 0 && (
        <>
          <SearchField value={f.q} onChange={(q) => set({ q })} placeholder={t.filters.searchBookings} />
          {advanced && (
            <FilterBar count={t.filters.results(list.length)} active={filtered} onClear={() => setF(NO_BOOKING_FILTER)} clearLabel={t.filters.clear}>
              <Field label={t.filters.payment}>
                <Select value={f.payment} onChange={(e) => set({ payment: e.target.value as BookingFilter["payment"] })}>
                  {(["all", "unpaid", "partial", "paid"] as const).map((k) => (
                    <option key={k} value={k}>
                      {t.bookings.paymentFilter[k]}
                    </option>
                  ))}
                </Select>
              </Field>
              {!hasNoUnits(data) && <Field label={units.one}>
                <Select value={f.unitId} onChange={(e) => set({ unitId: e.target.value })}>
                  <option value="all">{t.filters.any}</option>
                  {[...data.cages]
                    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </Select>
              </Field>}
              <Field label={t.filters.source}>
                <Select value={f.source} onChange={(e) => set({ source: e.target.value as BookingFilter["source"] })}>
                  <option value="all">{t.filters.any}</option>
                  {(Object.keys(t.bookingForm.sources) as BookingSource[]).map((s) => (
                    <option key={s} value={s}>
                      {t.bookingForm.sources[s]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t.filters.species}>
                <Select value={f.species} onChange={(e) => set({ species: e.target.value as BookingFilter["species"] })}>
                  <option value="all">{t.filters.any}</option>
                  {(["cat", "dog", "rabbit", "other"] as const).map((s) => (
                    <option key={s} value={s}>
                      {t.common.species[s]}
                    </option>
                  ))}
                </Select>
              </Field>
            </FilterBar>
          )}
        </>
      )}
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
                names={petNames(data, b)}
                owner={data.owners.find((o) => o.id === pet?.ownerId)}
                cage={data.cages.find((c) => c.id === b.cageId)}
                unitLabel={unitLabel(data, data.cages.find((c) => c.id === b.cageId))}
                checkInTo={b.status === "booked" && b.checkIn <= today ? `/app/bookings/${b.id}#checkin` : undefined}
                onCheckOut={b.status === "checked_in" ? () => checkOut.request(b) : undefined}
                onCancel={b.status === "booked" ? () => cancel.request(b) : undefined}
              />
            );
          })
        ) : (
          <EmptyState
            art="feature-calendar"
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
      {checkOut.dialog}
      {cancel.dialog}
    </>
  );
}
