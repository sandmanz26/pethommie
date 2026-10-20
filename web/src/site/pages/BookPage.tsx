import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { useDocumentMeta } from "@/shared/hooks/useDocumentMeta";
import { decodeCard, requestMessage, type LinkRequest, type LinkSpecies } from "@/shared/lib/bookingLink";
import { formatWhatsapp, normaliseWhatsapp } from "@/shared/lib/phone";
import { useLocale } from "@/shared/i18n/LocaleProvider";
import { Hanko } from "@/shared/ui/Hanko";
import { LanguageSwitch } from "@/shared/ui/LanguageSwitch";
import { Select } from "@/shared/ui/Select";
import { useSiteT } from "@/site/i18n/useSiteT";
import { Button } from "@/site/components/ui/Button";
import "./book.css";

const localDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const plusDays = (iso: string, n: number) => {
  const [y, m, d] = iso.split("-").map(Number);
  return localDay(new Date(y, m - 1, d + n));
};

/**
 * A pet hotel's public booking page, opened from the link the hotel shares. Everything about the hotel comes from
 * the link itself; the request is a WhatsApp message to the hotel, written for them, that the owner sends.
 */
export function BookPage() {
  const { hash } = useLocation();
  const card = useMemo(() => decodeCard(hash), [hash]);
  const { t, locale } = useSiteT();
  const { setLocale } = useLocale();
  const b = t.bookPage;
  const today = localDay();
  const [r, setR] = useState<LinkRequest>({ ownerName: "", ownerWa: "", petName: "", species: card?.species[0] ?? "cat", breed: "", checkIn: plusDays(today, 1), checkOut: plusDays(today, 3), preference: "", notes: "" });
  const [errors, setErrors] = useState<Partial<Record<"name" | "wa" | "pet" | "dates", string>>>({});
  const [sent, setSent] = useState(false);
  const set = (patch: Partial<LinkRequest>) => setR((prev) => ({ ...prev, ...patch }));
  useDocumentMeta({ title: card ? b.metaTitle(card.hotel) : b.badTitle, robots: "noindex" });

  // The page opens in the hotel's language; the visitor can switch.
  useEffect(() => {
    if (card) setLocale(card.lang);
    // only when a new link is opened
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card?.lang]);

  if (!card) {
    return (
      <main className="book book--bad">
        <div className="wrap book__inner">
          <Hanko size={44} />
          <h1>{b.badTitle}</h1>
          <p>{b.badBody}</p>
          <Link className="btn btn--solid" to="/">
            Pethommie
          </Link>
        </div>
      </main>
    );
  }

  const rp = (n: number) => new Intl.NumberFormat(locale === "id" ? "id-ID" : "en-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

  function submit(e: FormEvent) {
    e.preventDefault();
    const err: typeof errors = {};
    if (!r.ownerName.trim()) err.name = b.errName;
    if (!normaliseWhatsapp(r.ownerWa)) err.wa = b.errWa;
    if (!r.petName.trim()) err.pet = b.errPet;
    if (!(r.checkOut > r.checkIn) || r.checkIn < today) err.dates = b.errDates;
    setErrors(err);
    if (Object.keys(err).length) return;
    const text = requestMessage(card!, r, window.location.origin);
    window.open(`https://wa.me/${card!.wa}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
    setSent(true);
  }

  const field = (key: keyof typeof errors) => (errors[key] ? { "aria-invalid": true, "aria-describedby": `err-${key}` } : {});
  const error = (key: keyof typeof errors) =>
    errors[key] && (
      <span className="book__error" id={`err-${key}`} role="alert">
        {errors[key]}
      </span>
    );

  return (
    <main className="book">
      <div className="wrap book__inner">
        <header className="book__top">
          <span className="book__avatar" aria-hidden="true">{card.hotel.charAt(0).toUpperCase()}</span>
          <div>
            <h1>{card.hotel}</h1>
            {card.city && <p>{card.city}</p>}
          </div>
          <LanguageSwitch label="Language" />
        </header>

        <section className="book__card">
          {card.prices.length > 0 && (
            <>
              <h2>{b.prices}</h2>
              <ul className="book__prices">
                {card.prices.map((x) => (
                  <li key={x.label}>
                    <span>{x.label}</span>
                    <b>
                      {rp(x.price)}
                      <small> / {b.perNight}</small>
                    </b>
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="book__takes">
            {b.takes}: {card.species.map((s) => b.speciesNames[s]).join(" · ")}
          </p>
          {card.note && <p className="book__note">{card.note}</p>}
        </section>

        <form className="form book__form" onSubmit={submit} noValidate>
          <h2>{b.formTitle}</h2>
          <p className="book__lead">{b.formLead}</p>
          <div className="form__row">
            <div className="book__field">
              <label htmlFor="b-name">{b.ownerName}</label>
              <input id="b-name" autoComplete="name" value={r.ownerName} onChange={(e) => set({ ownerName: e.target.value })} {...field("name")} />
              {error("name")}
            </div>
            <div className="book__field">
              <label htmlFor="b-wa">{b.ownerWa}</label>
              <input id="b-wa" inputMode="tel" autoComplete="tel" placeholder="0812 3456 7890" value={r.ownerWa} onChange={(e) => set({ ownerWa: e.target.value })} {...field("wa")} />
              {error("wa")}
            </div>
          </div>
          <div className="form__row">
            <div className="book__field">
              <label htmlFor="b-pet">{b.petName}</label>
              <input id="b-pet" value={r.petName} onChange={(e) => set({ petName: e.target.value })} {...field("pet")} />
              {error("pet")}
            </div>
            <div className="book__field">
              <label htmlFor="b-species">{b.species}</label>
              <Select id="b-species" value={r.species} onChange={(e) => set({ species: e.target.value as LinkSpecies })}>
                {card.species.map((s) => (
                  <option key={s} value={s}>
                    {b.speciesNames[s]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="book__field">
              <label htmlFor="b-breed"><span>
                {b.breed} <small>({b.optional})</small>
              </span></label>
              <input id="b-breed" value={r.breed} onChange={(e) => set({ breed: e.target.value })} />
            </div>
          </div>
          <div className="form__row">
            <div className="book__field">
              <label htmlFor="b-in">{b.checkIn}</label>
              <input id="b-in" type="date" min={today} value={r.checkIn} onChange={(e) => e.target.value && set({ checkIn: e.target.value, checkOut: r.checkOut > e.target.value ? r.checkOut : plusDays(e.target.value, 1) })} {...field("dates")} />
            </div>
            <div className="book__field">
              <label htmlFor="b-out">{b.checkOut}</label>
              <input id="b-out" type="date" min={plusDays(r.checkIn, 1)} value={r.checkOut} onChange={(e) => e.target.value && set({ checkOut: e.target.value })} {...field("dates")} />
            </div>
            {card.prices.length > 0 && (
              <div className="book__field">
                <label htmlFor="b-pref">{b.preference}</label>
                <Select id="b-pref" value={r.preference} onChange={(e) => set({ preference: e.target.value })}>
                  <option value="">{b.anyPreference}</option>
                  {card.prices.map((x) => (
                    <option key={x.label} value={x.label}>
                      {x.label}
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </div>
          {error("dates")}
          <div className="book__field">
            <label htmlFor="b-notes"><span>
              {b.notes} <small>({b.optional})</small>
            </span></label>
            <textarea id="b-notes" rows={3} placeholder={b.notesPh} value={r.notes} onChange={(e) => set({ notes: e.target.value })} />
          </div>
          <Button type="submit" className="form__submit">
            {b.send}
          </Button>
          {sent && (
            <p className="book__sent" role="status">
              {b.sent}
            </p>
          )}
          <p className="book__wa">WhatsApp {formatWhatsapp(card.wa)}</p>
        </form>

        <footer className="book__foot">
          <Link to="/">{b.poweredBy}</Link>
        </footer>
      </div>
    </main>
  );
}
