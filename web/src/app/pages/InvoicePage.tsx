import { useState } from "react";
import { useParams } from "react-router-dom";
import { invoicePayment, invoiceOutdated } from "@/app/domain/invoices";
import { formatDate, todayISO } from "@/app/domain/logic";
import { invoiceMessage, waLink } from "@/app/domain/messages";
import { paidAmount } from "@/app/domain/payments";
import type { Language } from "@/app/domain/types";
import { useStore } from "@/app/store/AppStore";
import { useAppT } from "@/app/i18n/useAppT";
import { Button } from "@/app/design-system/atoms/Button";
import { Muted } from "@/app/design-system/atoms/Text";
import { Alert } from "@/app/design-system/molecules/Alert";
import { ConfirmDialog } from "@/app/design-system/molecules/ConfirmDialog";
import { EmptyState } from "@/app/design-system/molecules/EmptyState";
import { Segmented } from "@/app/design-system/molecules/Segmented";
import { InvoiceDocument } from "@/app/design-system/organisms/InvoiceDocument";
import { PageHeader } from "@/app/design-system/organisms/PageHeader";
import "./pages.css";

/** One invoice, laid out to print or save as a PDF. The buttons around it stay out of the printout. */
export function InvoicePage() {
  const { id = "" } = useParams();
  const { data, voidInvoice } = useStore();
  const { t, locale } = useAppT();
  const p = t.invoicePage;
  const invoice = data.invoices.find((i) => i.id === id);
  const [shown, setShown] = useState<Language | null>(null);
  const [confirm, setConfirm] = useState(false);

  if (!invoice) {
    return (
      <>
        <PageHeader title={t.nav.invoices} back={{ to: "/app/invoices", label: p.back }} />
        <EmptyState art="reservation">{p.notFound}</EmptyState>
      </>
    );
  }

  const language = shown ?? invoice.language;
  const booking = data.bookings.find((b) => b.id === invoice.bookingId);
  const paid = booking ? paidAmount(booking) : null;
  const balance = paid === null ? 0 : Math.max(0, invoice.total - paid);
  const owner = data.owners.find((o) => o.id === data.pets.find((x) => x.id === booking?.petId)?.ownerId);
  const whatsapp = waLink(owner?.whatsapp ?? invoice.customer.whatsapp, invoiceMessage(invoice, invoicePayment(data, invoice) === "unknown" ? 0 : balance));

  return (
    <>
      <div className="no-print">
        <PageHeader
          title={invoice.number}
          lead={booking ? undefined : undefined}
          back={{ to: "/app/invoices", label: p.back }}
          actions={
            <>
              {invoice.status === "issued" && (
                <a className="ds-btn ds-btn--secondary ds-btn--md" href={whatsapp} target="_blank" rel="noopener noreferrer">
                  <span>{p.sendWhatsapp}</span>
                </a>
              )}
              <Button icon="printer" onClick={() => window.print()}>
                {p.print}
              </Button>
              {invoice.status === "issued" && (
                <Button variant="ghost" icon="x" onClick={() => setConfirm(true)}>
                  {p.void}
                </Button>
              )}
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
          <Muted>{p.printHint}</Muted>
        </div>
        {invoice.status === "void" && invoice.voidedOn && <Alert tone="danger">{p.voidedBanner(formatDate(invoice.voidedOn, locale))}</Alert>}
        {invoiceOutdated(data, invoice) && <Alert tone="warn">{p.outdated}</Alert>}
      </div>

      <InvoiceDocument invoice={invoice} language={language} paid={paid} />

      <ConfirmDialog
        open={confirm}
        message={p.voidConfirm(invoice.number)}
        confirmLabel={p.void}
        cancelLabel={p.keep}
        danger
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          voidInvoice(invoice.id, todayISO());
          setConfirm(false);
        }}
      />
    </>
  );
}
