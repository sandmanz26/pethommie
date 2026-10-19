import { useState } from "react";
import type { Booking } from "@/app/domain/types";
import { formatRupiah } from "@/app/domain/logic";
import { balanceDue } from "@/app/domain/payments";
import { useStore } from "@/app/store/AppStore";
import { useAppT } from "@/app/i18n/useAppT";
import { ConfirmDialog } from "@/app/design-system/molecules/ConfirmDialog";

/**
 * Check a pet out, but stop and ask first when money is still owed, so a balance isn't forgotten at the
 * door. Render `dialog` once on the page and call `request(booking)` from any button.
 */
export function useCheckOut() {
  const { data, setBookingStatus } = useStore();
  const { t, locale } = useAppT();
  const [pending, setPending] = useState<{ id: string; due: number } | null>(null);

  const request = (booking: Booking) => {
    const due = balanceDue(booking, data.cages.find((c) => c.id === booking.cageId));
    if (due > 0) setPending({ id: booking.id, due });
    else setBookingStatus(booking.id, "checked_out");
  };

  const dialog = (
    <ConfirmDialog
      open={pending !== null}
      message={pending ? t.bookingDetail.checkOutUnpaid(formatRupiah(pending.due, locale)) : ""}
      confirmLabel={t.bookingDetail.checkOutAnyway}
      cancelLabel={t.common.cancel}
      danger
      onCancel={() => setPending(null)}
      onConfirm={() => {
        if (pending) setBookingStatus(pending.id, "checked_out");
        setPending(null);
      }}
    />
  );
  return { request, dialog };
}
