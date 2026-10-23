import { Select } from "@/shared/ui/Select";
import { useState, type FormEvent } from "react";
import { useSiteT } from "@/site/i18n/useSiteT";
import { normaliseWhatsapp } from "@/shared/lib/phone";
import { LIMITS, textIssue } from "@/shared/lib/validate";
import { useFocusInvalid } from "@/shared/hooks/useFocusInvalid";
import { waitlistStore } from "@/site/lib/waitlist";
import { Button } from "@/site/components/ui/Button";
import "./sections.css";

type Status = { kind: "idle" } | { kind: "sent" };
type Key = "hotelName" | "city" | "whatsapp";

/** "Help me set up": a pet hotel leaves its details and the team reaches out on WhatsApp. */
export function WaitlistForm() {
  const { t } = useSiteT();
  const waitlist = t.waitlist;
  const v = t.validation;
  const [errors, setErrors] = useState<Partial<Record<Key, string>>>({});
  const { ref, focusInvalid } = useFocusInvalid();
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
    const words = (value: string, required: string, rules: { min: number; max: number }) => {
      const issue = textIssue(value, { required: true, ...rules });
      return issue === "required" ? required : issue === "tooShort" ? v.tooShort(rules.min) : issue === "tooLong" ? v.tooLong(rules.max) : undefined;
    };
    const wa = normaliseWhatsapp(whatsapp);
    const err: Partial<Record<Key, string>> = {};
    const name = words(hotelName, v.hotelName, LIMITS.hotelName);
    const town = words(city, v.city, LIMITS.city);
    if (name) err.hotelName = name;
    if (town) err.city = town;
    if (!whatsapp.trim()) err.whatsapp = v.whatsapp;
    else if (!wa) err.whatsapp = waitlist.errors.whatsapp;
    setErrors(err);
    if (!wa || Object.keys(err).length) return void focusInvalid();
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

  const clear = (key: Key) => setErrors((x) => ({ ...x, [key]: undefined }));
  const aria = (key: Key) => (errors[key] ? { "aria-invalid": true, "aria-describedby": `f-err-${key}` } : {});
  const message = (key: Key) =>
    errors[key] && (
      <span className="form__error" id={`f-err-${key}`} role="alert">
        {errors[key]}
      </span>
    );

  return status.kind === "sent" ? (
    <div className="notice" role="status">
      <p>{waitlist.success}</p>
      {waitlistStore.isLocalOnly && <p className="notice__demo">{waitlist.demoNote}</p>}
    </div>
  ) : (
    <form ref={ref} className="form" onSubmit={onSubmit} noValidate>
      <div className="form__row">
        <label htmlFor="f-name">
          {f.hotelName.label}
          <input id="f-name" value={hotelName} onChange={(e) => (setHotelName(e.target.value), clear("hotelName"))} placeholder={f.hotelName.placeholder} {...aria("hotelName")} />
          {message("hotelName")}
        </label>
        <label htmlFor="f-wa">
          {f.whatsapp.label}
          <input id="f-wa" inputMode="tel" autoComplete="tel" value={whatsapp} onChange={(e) => (setWhatsapp(e.target.value), clear("whatsapp"))} placeholder={f.whatsapp.placeholder} {...aria("whatsapp")} />
          {message("whatsapp")}
        </label>
      </div>
      <div className="form__row">
        <label htmlFor="f-city">
          {f.city.label}
          <input id="f-city" value={city} onChange={(e) => (setCity(e.target.value), clear("city"))} placeholder={f.city.placeholder} {...aria("city")} />
          {message("city")}
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
    </form>
  );
}
