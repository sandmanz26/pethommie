import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { petNames } from "@/app/domain/invoices";
import { receiptNumbers } from "@/app/domain/ledger";
import { receiptMessage, waLink } from "@/app/domain/messages";
import type { Language } from "@/app/domain/types";
import { useStore } from "@/app/store/AppStore";
import { useAppT, messagesFor } from "@/app/i18n/useAppT";
import { Button } from "@/app/design-system/atoms/Button";
import { Muted } from "@/app/design-system/atoms/Text";
import { EmptyState } from "@/app/design-system/molecules/EmptyState";
import { Segmented } from "@/app/design-system/molecules/Segmented";
import { PageHeader } from "@/app/design-system/organisms/PageHeader";
import { ReceiptDocument, standingAfter } from "@/app/design-system/organisms/ReceiptDocument";
import "./pages.css";

/** The receipt for one payment, to print, save as a PDF, or send on WhatsApp. */
export function ReceiptPage() {
  const { bookingId = "", paymentId = "" } = useParams();
  const { data } = useStore();
  const { t } = useAppT();
  const p = t.receiptPage;
  const booking = data.bookings.find((b) => b.id === bookingId);
  const payment = booking?.payments.find((x) => x.id === paymentId);
  const number = useMemo(() => receiptNumbers(data).get(paymentId) ?? "", [data, paymentId]);
  const owner = data.owners.find((o) => o.id === data.pets.find((x) => x.id === booking?.petId)?.ownerId);
  const [shown, setShown] = useState<Language | null>(null);

  if (!booking || !payment) {
    return (
      <>
        <PageHeader title={t.payments.receipt} back={{ to: booking ? `/app/bookings/${booking.id}` : "/app/payments", label: p.back }} />
        <EmptyState icon="bookings">{p.notFound}</EmptyState>
      </>
    );
  }

  const language = shown ?? owner?.language ?? data.settings.invoiceLanguage;
  const pets = petNames(data, booking);
  const after = standingAfter(booking, data.cages.find((c) => c.id === booking.cageId), payment);
  const message = receiptMessage({
    hotelName: data.hotel?.name ?? "",
    ownerName: owner?.name ?? "",
    petName: pets,
    language,
    receipt: number,
    amount: payment.amount,
    refund: payment.kind === "refund",
    method: messagesFor(language).receiptDoc.methods[payment.method],
    balance: after.balance,
  });

  return (
    <>
      <div className="no-print">
        <PageHeader
          title={number || t.payments.receipt}
          back={{ to: `/app/bookings/${booking.id}`, label: p.back }}
          actions={
            <>
              <a className="ds-btn ds-btn--secondary ds-btn--md" href={waLink(owner?.whatsapp ?? "", message)} target="_blank" rel="noopener noreferrer">
                <span>{p.sendWhatsapp}</span>
              </a>
              <Button icon="printer" onClick={() => window.print()}>
                {p.print}
              </Button>
            </>
          }
        />
        <div className="pg-invoice-tools">
          <Segmented<Language>
            label={p.showIn}
            value={language}
            onChange={setShown}
            options={[
              { value: "id", label: t.settingsBiz.languages.id },
              { value: "en", label: t.settingsBiz.languages.en },
            ]}
          />
          <Muted>{t.invoicePage.printHint}</Muted>
        </div>
      </div>
      <ReceiptDocument data={data} booking={booking} payment={payment} owner={owner} pets={pets} number={number} language={language} />
    </>
  );
}
