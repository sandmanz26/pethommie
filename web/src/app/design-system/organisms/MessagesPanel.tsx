import type { Booking, Cage, Hotel, Owner, Pet, StayCounting } from "@/app/domain/types";
import { bookingTotal, todayISO, vaccineState } from "@/app/domain/logic";
import { balanceDue, paidAmount } from "@/app/domain/payments";
import { arrivalNotice, bookingConfirmation, pickupReminder, vaccineReminder } from "@/app/domain/messages";
import { Alert } from "@/app/design-system/molecules/Alert";
import { Heading, Muted } from "@/app/design-system/atoms/Text";
import { WhatsAppMessage } from "@/app/design-system/molecules/WhatsAppMessage";
import { useAppT } from "@/app/i18n/useAppT";
import "./organisms.css";

/** The other messages an operator keeps typing by hand: confirmation, arrival, pickup, vaccine. */
export function MessagesPanel({ hotel, booking, pet, owner, cage, unitName, petName, counting = "nights" }: { hotel: Hotel; booking: Booking; pet: Pet; owner: Owner | undefined; cage: Cage | undefined; /** The unit as the owner reads it; empty leaves it out (a hotel without cages or rooms). */ unitName?: string; petName?: string; counting?: StayCounting }) {
  const { t } = useAppT();
  const m = t.messages;
  const base = { hotelName: hotel.name, ownerName: owner?.name ?? "", petName: petName ?? pet.name, language: owner?.language };
  const wa = owner?.whatsapp ?? "";
  const vState = vaccineState(pet, todayISO());
  const items: { key: string; label: string; text: string }[] = [
    {
      key: "confirmation",
      label: m.confirmation,
      text: bookingConfirmation({ ...base, checkIn: booking.checkIn, checkOut: booking.checkOut, cageName: unitName ?? cage?.name ?? "-", total: bookingTotal(booking, cage, counting), paid: paidAmount(booking) }),
    },
    ...(booking.arrival ? [{ key: "arrival", label: m.arrival, text: arrivalNotice({ ...base, arrival: booking.arrival }) }] : []),
    { key: "pickup", label: m.pickup, text: pickupReminder({ ...base, checkOut: booking.checkOut, balance: balanceDue(booking, cage, counting) }) },
    ...(vState !== "ok" ? [{ key: "vaccine", label: m.vaccine, text: vaccineReminder({ ...base, expiry: pet.vaccineExpiry, state: vState }) }] : []),
  ];
  return (
    <section className="ds-panel" aria-labelledby="messages-title">
      <div>
        <Heading level={2} size="md">
          <span id="messages-title">{m.title}</span>
        </Heading>
        <Muted>{m.lead}</Muted>
      </div>
      {!wa && <Alert tone="info">{t.report.noWhatsapp}</Alert>}
      <Muted>{t.report.language(t.settingsBiz.languages[owner?.language ?? "id"])}</Muted>
      {items.map((i) => (
        <details key={i.key} className="ds-earlier">
          <summary>{i.label}</summary>
          <WhatsAppMessage hideLabel label={i.label} text={i.text} whatsapp={wa} openLabel={m.open} copyLabel={t.report.copy} copiedLabel={t.report.copied} />
        </details>
      ))}
    </section>
  );
}
