import { useEffect, useMemo, useState } from "react";
import { cardFor, defaultLinkOptions, type LinkOptions } from "@/app/domain/linkCard";
import { formatRupiah } from "@/app/domain/logic";
import { waLink } from "@/app/domain/messages";
import type { Language } from "@/app/domain/types";
import { linkFor, type LinkSpecies } from "@/shared/lib/bookingLink";
import { formatWhatsapp } from "@/shared/lib/phone";
import { useAuth } from "@/app/auth/AuthProvider";
import { useStore } from "@/app/store/AppStore";
import { useAppT, messagesFor } from "@/app/i18n/useAppT";
import { Button } from "@/app/design-system/atoms/Button";
import { Checkbox } from "@/app/design-system/atoms/Checkbox";
import { Input, Textarea } from "@/app/design-system/atoms/Input";
import { Heading, Muted } from "@/app/design-system/atoms/Text";
import { Alert } from "@/app/design-system/molecules/Alert";
import { Field } from "@/app/design-system/molecules/Field";
import { Segmented } from "@/app/design-system/molecules/Segmented";
import { PageHeader } from "@/app/design-system/organisms/PageHeader";
import "./pages.css";

const SPECIES: LinkSpecies[] = ["cat", "dog", "rabbit", "other"];
const keyFor = (accountId: string) => `pethommie.link.${accountId}`;

function readOptions(key: string, fallback: LinkOptions): LinkOptions {
  try {
    const raw = JSON.parse(localStorage.getItem(key) ?? "null") as Partial<LinkOptions> | null;
    return raw ? { ...fallback, ...raw } : fallback;
  } catch {
    return fallback;
  }
}

/** The owner makes the hotel's public booking link: what it shows, a preview, and ways to share it. */
export function LinkPage() {
  const { data } = useStore();
  const { account } = useAuth();
  const { t } = useAppT();
  const p = t.linkPage;
  const key = keyFor(account?.id ?? "local");
  const [o, setO] = useState<LinkOptions>(() => readOptions(key, defaultLinkOptions(data)));
  const [copied, setCopied] = useState(false);
  const set = (patch: Partial<LinkOptions>) => setO((prev) => ({ ...prev, ...patch }));

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(o));
    } catch {
      // Not remembered; the link still works.
    }
  }, [key, o]);

  const card = useMemo(() => cardFor(data, o), [data, o]);
  const url = card ? linkFor(window.location.origin, card) : "";
  const shown = messagesFor(o.lang);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked: the link is selectable in the field.
    }
  }

  return (
    <>
      <PageHeader art="app-link" title={p.title} lead={p.lead} />
      {!card && (
        <Alert tone="warn">
          {p.noNumber}{" "}
          <Button size="sm" to="/app/settings">
            {p.toSettings}
          </Button>
        </Alert>
      )}

      <div className="pg-columns">
        <section className="pg-panel" aria-label={p.optionsTitle}>
          <h2 className="pg-panel__title">{p.optionsTitle}</h2>
          <div className="ds-field">
            <span className="ds-field__label">{p.language}</span>
            <Segmented<Language>
                label={p.language}
                value={o.lang}
                onChange={(lang) => set({ lang })}
                options={[
                  { value: "id", label: t.settingsBiz.languages.id },
                  { value: "en", label: t.settingsBiz.languages.en },
                ]}
            />
          </div>
          <Checkbox label={p.showPrices} checked={o.showPrices} onChange={(e) => set({ showPrices: e.target.checked })} />
          <fieldset className="pg-link__species">
            <legend>{p.species}</legend>
            {SPECIES.map((s) => (
              <Checkbox
                key={s}
                label={t.common.species[s]}
                checked={o.species.includes(s)}
                onChange={(e) => set({ species: e.target.checked ? SPECIES.filter((x) => x === s || o.species.includes(x)) : o.species.length > 1 ? o.species.filter((x) => x !== s) : o.species })}
              />
            ))}
          </fieldset>
          <Field label={p.note} optional={t.common.optional}>
            <Textarea value={o.note} maxLength={280} onChange={(e) => set({ note: e.target.value })} placeholder={p.notePh} />
          </Field>
        </section>

        <section className="pg-panel" aria-label={p.previewTitle}>
          <h2 className="pg-panel__title">{p.previewTitle}</h2>
          {card && (
            <div className="pg-link__preview" lang={o.lang}>
              <b>{card.hotel}</b>
              {card.city && <small>{card.city}</small>}
              {card.prices.length > 0 && (
                <ul>
                  {card.prices.map((x) => (
                    <li key={x.label}>
                      <span>{x.label}</span>
                      <span>
                        {formatRupiah(x.price, o.lang)}
                        <small> / {o.lang === "id" ? "malam" : "night"}</small>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <small>{card.species.map((s) => shown.common.species[s]).join(" · ")}</small>
              {card.note && <p>{card.note}</p>}
              <small>WhatsApp {formatWhatsapp(card.wa)}</small>
            </div>
          )}
          <Field label={p.yourLink}>
            <Input readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
          </Field>
          <div className="pg-toolbar">
            <Button icon={copied ? "check" : "copy"} onClick={copy} disabled={!card}>
              {copied ? p.copied : p.copy}
            </Button>
            {card && (
              <>
                <a className="ds-btn ds-btn--secondary ds-btn--md" href={waLink("", p.shareText(card.hotel, url))} target="_blank" rel="noopener noreferrer">
                  <span>{p.share}</span>
                </a>
                <a className="ds-btn ds-btn--ghost ds-btn--md" href={url} target="_blank" rel="noopener noreferrer">
                  <span>{p.open}</span>
                </a>
              </>
            )}
          </div>
          <Muted>{p.honest}</Muted>
        </section>
      </div>

      <section className="pg-section">
        <Heading level={2} size="md">{p.howTitle}</Heading>
        <ol className="pg-link__how">
          {p.how.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
    </>
  );
}
