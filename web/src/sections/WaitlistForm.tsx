import { useState, type FormEvent } from "react";
import { waitlist } from "../content/landing";
import { normaliseWhatsapp, waitlistStore } from "../lib/waitlist";
import { Button } from "../components/ui/Button";
import "./sections.css";

type Status = { kind: "idle" } | { kind: "error"; message: string } | { kind: "sent" };

export function WaitlistForm() {
  const [hotelName, setHotelName] = useState("");
  const [city, setCity] = useState("");
  const [cages, setCages] = useState(waitlist.cageOptions[1]);
  const [whatsapp, setWhatsapp] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!hotelName.trim() || !city.trim() || !whatsapp.trim()) {
      setStatus({ kind: "error", message: "Lengkapi nama pet hotel, kota, dan nomor WhatsApp dulu." });
      return;
    }
    const wa = normaliseWhatsapp(whatsapp);
    if (!wa) {
      setStatus({ kind: "error", message: "Nomor WhatsApp belum benar. Contoh yang valid: 0812 3456 7890." });
      return;
    }
    setBusy(true);
    await waitlistStore.submit({ hotelName: hotelName.trim(), city: city.trim(), cages, whatsapp: wa });
    setBusy(false);
    setStatus({ kind: "sent" });
  }

  return (
    <section className="section" id="gabung">
      <div className="wrap join">
        <div className="section-head join__head">
          <span className="eyebrow">{waitlist.eyebrow}</span>
          <h2>{waitlist.title}</h2>
          <p>{waitlist.lead}</p>
        </div>

        {status.kind === "sent" ? (
          <div className="notice" role="status">
            <p>{waitlist.success}</p>
            {waitlistStore.isLocalOnly && (
              <p className="notice__demo">Mode demo: belum ada server, data hanya tersimpan di browser ini.</p>
            )}
          </div>
        ) : (
          <form className="form" onSubmit={onSubmit} noValidate>
            <label htmlFor="f-name">
              Nama pet hotel
              <input id="f-name" value={hotelName} onChange={(e) => setHotelName(e.target.value)} placeholder="Contoh: Rumah Meong Bintaro" />
            </label>
            <div className="form__row">
              <label htmlFor="f-city">
                Kota
                <input id="f-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Contoh: Tangerang Selatan" />
              </label>
              <label htmlFor="f-cages">
                Jumlah kandang
                <select id="f-cages" value={cages} onChange={(e) => setCages(e.target.value)}>
                  {waitlist.cageOptions.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </label>
            </div>
            <label htmlFor="f-wa">
              Nomor WhatsApp
              <input id="f-wa" inputMode="tel" autoComplete="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="08xx xxxx xxxx" />
            </label>
            <Button type="submit" disabled={busy} className="form__submit">
              {waitlist.submit}
            </Button>
            {status.kind === "error" && (
              <p className="form__error" role="alert">
                {status.message}
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  );
}
