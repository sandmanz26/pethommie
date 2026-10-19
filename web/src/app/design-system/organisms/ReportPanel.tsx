import { useMemo } from "react";
import type { Booking, CareEntry, Hotel, ISODate, Owner, Pet } from "@/app/domain/types";
import { stayDay, timeOf } from "@/app/domain/logic";
import { dailyReport } from "@/app/domain/messages";
import { Alert } from "@/app/design-system/molecules/Alert";
import { Heading, Muted } from "@/app/design-system/atoms/Text";
import { WhatsAppMessage } from "@/app/design-system/molecules/WhatsAppMessage";
import { useAppT } from "@/app/i18n/useAppT";
import "./organisms.css";

/** Today's report for the owner, built from the care log, ready to send from the operator's own WhatsApp. */
export function ReportPanel({
  hotel,
  booking,
  pet,
  owner,
  date,
  entries,
  sentAt,
  onSent,
}: {
  hotel: Hotel;
  booking: Booking;
  pet: Pet;
  owner: Owner | undefined;
  date: ISODate;
  entries: CareEntry[];
  /** When it was sent today, if it was. */
  sentAt: string | null;
  onSent: () => void;
}) {
  const { t, locale } = useAppT();
  const r = t.report;
  const text = useMemo(
    () =>
      dailyReport({
        hotelName: hotel.name,
        ownerName: owner?.name ?? "",
        petName: pet.name,
        date,
        day: stayDay(booking.checkIn, date),
        entries,
      }),
    [hotel.name, owner?.name, pet.name, date, booking.checkIn, entries],
  );
  return (
    <section className="ds-panel" aria-labelledby="report-title">
      <div>
        <Heading level={2} size="md">
          <span id="report-title">{r.title}</span>
        </Heading>
        <Muted>{r.lead}</Muted>
      </div>
      {!owner?.whatsapp && <Alert tone="info">{r.noWhatsapp}</Alert>}
      <WhatsAppMessage
        hideLabel
        key={text}
        label={r.title}
        text={text}
        whatsapp={owner?.whatsapp ?? ""}
        openLabel={r.send}
        resendLabel={r.resend}
        copyLabel={r.copy}
        copiedLabel={r.copied}
        opened={sentAt !== null}
        status={<Muted>{sentAt ? r.sent(timeOf(sentAt, locale)) : r.notSent}</Muted>}
        onOpen={onSent}
      />
      <Muted>{r.language}</Muted>
    </section>
  );
}
