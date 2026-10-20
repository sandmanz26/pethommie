import { useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { customerOf } from "@/app/domain/customers";
import { formatRupiah } from "@/app/domain/logic";
import { formatWhatsapp, normaliseWhatsapp } from "@/shared/lib/phone";
import { useStore } from "@/app/store/AppStore";
import { useAppT } from "@/app/i18n/useAppT";
import { Button } from "@/app/design-system/atoms/Button";
import { Input, Select } from "@/app/design-system/atoms/Input";
import type { Language } from "@/app/domain/types";
import { Heading, Muted } from "@/app/design-system/atoms/Text";
import { Alert } from "@/app/design-system/molecules/Alert";
import { EmptyState } from "@/app/design-system/molecules/EmptyState";
import { Field } from "@/app/design-system/molecules/Field";
import { StatCard } from "@/app/design-system/molecules/StatCard";
import { BookingCard } from "@/app/design-system/organisms/BookingCard";
import { PageHeader } from "@/app/design-system/organisms/PageHeader";
import { PetRow } from "@/app/design-system/organisms/PetRow";
import { involvesPet, todayISO } from "@/app/domain/logic";
import { petNames } from "@/app/domain/invoices";
import "./pages.css";

/** One owner: contact, pets, history, and what they owe. */
export function CustomerDetailPage() {
  const { id = "" } = useParams();
  const { data, saveOwner } = useStore();
  const { t, locale } = useAppT();
  const c = t.customersPage;
  const owner = data.owners.find((o) => o.id === id);

  if (!owner) {
    return (
      <>
        <PageHeader title={c.title} back={{ to: "/app/customers", label: t.common.back }} />
        <EmptyState art="dog">{c.notFound}</EmptyState>
      </>
    );
  }
  // Keyed by owner so a different owner starts from their own details.
  return <Detail key={owner.id} ownerId={owner.id} data={data} saveOwner={saveOwner} locale={locale} c={c} t={t} />;
}

type Props = {
  ownerId: string;
  data: ReturnType<typeof useStore>["data"];
  saveOwner: ReturnType<typeof useStore>["saveOwner"];
  locale: string;
  c: ReturnType<typeof useAppT>["t"]["customersPage"];
  t: ReturnType<typeof useAppT>["t"];
};

function Detail({ ownerId, data, saveOwner, locale, c, t }: Props) {
  const owner = data.owners.find((o) => o.id === ownerId)!;
  const customer = customerOf(data, owner);
  const [name, setName] = useState(owner.name);
  const [wa, setWa] = useState(owner.whatsapp ? formatWhatsapp(owner.whatsapp) : "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [language, setLanguage] = useState<Language>(owner.language);
  const [saved, setSaved] = useState(false);
  const today = todayISO();
  const rp = (n: number) => formatRupiah(n, locale);
  const petIds = new Set(customer.pets.map((p) => p.id));
  const stays = data.bookings.filter((b) => petIds.has(b.petId)).sort((a, b) => b.checkIn.localeCompare(a.checkIn));

  function save(e: FormEvent) {
    e.preventDefault();
    const err: Record<string, string> = {};
    const number = wa.trim() ? normaliseWhatsapp(wa) : "";
    if (!name.trim()) err.name = c.errName;
    if (number === null) err.wa = c.errWhatsapp;
    else if (number) {
      const other = data.owners.find((o) => o.id !== owner.id && o.whatsapp === number);
      if (other) err.wa = c.errDuplicate(other.name);
    }
    setErrors(err);
    if (Object.keys(err).length) return;
    saveOwner({ id: owner.id, name: name.trim(), whatsapp: number ?? "", language });
    setSaved(true);
  }

  return (
    <>
      <PageHeader
        title={owner.name}
        lead={owner.whatsapp ? formatWhatsapp(owner.whatsapp) : c.noWhatsapp}
        back={{ to: "/app/customers", label: t.common.back }}
        actions={
          <>
            {owner.whatsapp && (
              <a className="ds-btn ds-btn--secondary ds-btn--md" href={`https://wa.me/${owner.whatsapp}`} target="_blank" rel="noopener noreferrer">
                <span>{c.openChat}</span>
              </a>
            )}
          </>
        }
      />

      <div className="pg-stats pg-stats--wide">
        <StatCard label={c.stays(customer.stays)} value={customer.stays} tone="info" />
        <StatCard label={c.nightsTotal} value={customer.nights} tone="brand" />
        <StatCard label={c.totalPaid} value={rp(customer.paid)} tone="ok" />
        <StatCard label={customer.owed > 0 ? c.owes : c.paidUp} value={customer.owed > 0 ? rp(customer.owed) : "–"} tone={customer.owed > 0 ? "warn" : "neutral"} />
      </div>

      <div className="pg-columns">
        <div className="pg-section">
          <Heading level={2} size="md">{c.petsTitle}</Heading>
          {customer.pets.map((p) => (
            <PetRow key={p.id} pet={p} owner={owner} stays={data.bookings.filter((b) => involvesPet(b, p.id) && b.status !== "cancelled").length} today={today} />
          ))}
          <form className="ds-form ds-form--panel" onSubmit={save} noValidate aria-label={c.editTitle}>
            <Heading level={2} size="md">{c.editTitle}</Heading>
            <Field label={c.name} error={errors.name}>
              <Input value={name} onChange={(e) => (setName(e.target.value), setSaved(false))} />
            </Field>
            <Field label={c.whatsapp} error={errors.wa} optional={t.common.optional}>
              <Input value={wa} onChange={(e) => (setWa(e.target.value), setSaved(false))} inputMode="tel" placeholder="08xx xxxx xxxx" />
            </Field>
            <Field label={c.language} hint={c.languageHint}>
              <Select value={language} onChange={(e) => (setLanguage(e.target.value as Language), setSaved(false))}>
                <option value="id">{c.languages.id}</option>
                <option value="en">{c.languages.en}</option>
              </Select>
            </Field>
            <div className="ds-form__actions">
              <Button type="submit" icon="check">{c.save}</Button>
              {saved && <Alert tone="ok">{c.saved}</Alert>}
            </div>
          </form>
        </div>

        <div className="pg-section">
          <Heading level={2} size="md">{c.historyTitle}</Heading>
          {stays.length ? (
            stays.map((b) => {
              const pet = data.pets.find((p) => p.id === b.petId);
              return <BookingCard key={b.id} booking={b} pet={pet} names={petNames(data, b)} owner={owner} cage={data.cages.find((x) => x.id === b.cageId)} />;
            })
          ) : (
            <Muted>{c.noStays}</Muted>
          )}
          {customer.pets[0] && (
            <Button to={`/app/bookings/new?pet=${customer.pets[0].id}`} variant="secondary" icon="plus">
              {c.bookAgain}
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
