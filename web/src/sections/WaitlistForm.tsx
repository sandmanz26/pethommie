import { useState, type FormEvent } from "react";
import { useLocale } from "../i18n/LocaleProvider";
import { normaliseWhatsapp, waitlistStore } from "../lib/waitlist";
import { Button } from "../components/ui/Button";
import "./sections.css";

type Status = { kind: "idle" } | { kind: "error"; error: "missing" | "whatsapp" } | { kind: "sent" };

export function WaitlistForm() {
  const waitlist = useLocale().t.waitlist;
  const f = waitlist.fields;
  const [hotelName, setHotelName] = useState("");
  const [city, setCity] = useState("");
  // Store the option index so the selection survives a language switch.
  const [cageIndex, setCageIndex] = useState(1);
  const [whatsapp, setWhatsapp] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!hotelName.trim() || !city.trim() || !whatsapp.trim()) {
      setStatus({ kind: "error", error: "missing" });
      return;
    }
    const wa = normaliseWhatsapp(whatsapp);
    if (!wa) {
      setStatus({ kind: "error", error: "whatsapp" });
      return;
    }
    setBusy(true);
    await waitlistStore.submit({
      hotelName: hotelName.trim(),
      city: city.trim(),
      cages: waitlist.cageOptions[cageIndex],
      whatsapp: wa,
    });
    setBusy(false);
    setStatus({ kind: "sent" });
  }

  return (
    <section className="section" id="join">
      <div className="wrap join">
        <div className="section-head join__head">
          <span className="eyebrow">{waitlist.eyebrow}</span>
          <h2>{waitlist.title}</h2>
          <p>{waitlist.lead}</p>
        </div>

        {status.kind === "sent" ? (
          <div className="notice" role="status">
            <p>{waitlist.success}</p>
            {waitlistStore.isLocalOnly && <p className="notice__demo">{waitlist.demoNote}</p>}
          </div>
        ) : (
          <form className="form" onSubmit={onSubmit} noValidate>
            <label htmlFor="f-name">
              {f.hotelName.label}
              <input id="f-name" value={hotelName} onChange={(e) => setHotelName(e.target.value)} placeholder={f.hotelName.placeholder} />
            </label>
            <div className="form__row">
              <label htmlFor="f-city">
                {f.city.label}
                <input id="f-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder={f.city.placeholder} />
              </label>
              <label htmlFor="f-cages">
                {f.cages.label}
                <select id="f-cages" value={cageIndex} onChange={(e) => setCageIndex(Number(e.target.value))}>
                  {waitlist.cageOptions.map((o, i) => (
                    <option key={o} value={i}>
                      {o}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label htmlFor="f-wa">
              {f.whatsapp.label}
              <input id="f-wa" inputMode="tel" autoComplete="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder={f.whatsapp.placeholder} />
            </label>
            <Button type="submit" disabled={busy} className="form__submit">
              {waitlist.submit}
            </Button>
            {status.kind === "error" && (
              <p className="form__error" role="alert">
                {waitlist.errors[status.error]}
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  );
}
