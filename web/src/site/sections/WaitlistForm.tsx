import { Select } from "@/shared/ui/Select";
import { useState, type FormEvent } from "react";
import { useSiteT } from "@/site/i18n/useSiteT";
import { normaliseWhatsapp } from "@/shared/lib/phone";
import { waitlistStore } from "@/site/lib/waitlist";
import { Button } from "@/site/components/ui/Button";
import "./sections.css";

type Status = { kind: "idle" } | { kind: "error"; error: "missing" | "whatsapp" } | { kind: "sent" };

/** "Help me set up": a pet hotel leaves its details and the team reaches out on WhatsApp. */
export function WaitlistForm() {
  const waitlist = useSiteT().t.waitlist;
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

  return status.kind === "sent" ? (
    <div className="notice" role="status">
      <p>{waitlist.success}</p>
      {waitlistStore.isLocalOnly && <p className="notice__demo">{waitlist.demoNote}</p>}
    </div>
  ) : (
    <form className="form" onSubmit={onSubmit} noValidate>
      <div className="form__row">
        <label htmlFor="f-name">
          {f.hotelName.label}
          <input id="f-name" value={hotelName} onChange={(e) => setHotelName(e.target.value)} placeholder={f.hotelName.placeholder} />
        </label>
        <label htmlFor="f-wa">
          {f.whatsapp.label}
          <input id="f-wa" inputMode="tel" autoComplete="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder={f.whatsapp.placeholder} />
        </label>
      </div>
      <div className="form__row">
        <label htmlFor="f-city">
          {f.city.label}
          <input id="f-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder={f.city.placeholder} />
        </label>
        <label htmlFor="f-cages">
          {f.cages.label}
          <Select id="f-cages" value={cageIndex} onChange={(e) => setCageIndex(Number(e.target.value))}>
            {waitlist.cageOptions.map((o, i) => (
              <option key={o} value={i}>
                {o}
              </option>
            ))}
          </Select>
        </label>
      </div>
      <Button type="submit" disabled={busy} className="form__submit">
        {waitlist.submit}
      </Button>
      {status.kind === "error" && (
        <p className="form__error" role="alert">
          {waitlist.errors[status.error]}
        </p>
      )}
    </form>
  );
}
