import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import type { CageSize } from "../domain/types";
import { formatRupiah, generateCages, normaliseWhatsapp, SIZE_ORDER } from "../domain/logic";
import { useStore } from "../store/AppStore";
import { useAppT } from "../i18n/useAppT";
import { Button } from "../design-system/atoms/Button";
import { Icon } from "../design-system/atoms/Icon";
import { Illustration } from "../design-system/atoms/Illustration";
import { Input } from "../design-system/atoms/Input";
import { Heading, Muted } from "../design-system/atoms/Text";
import { Alert } from "../design-system/molecules/Alert";
import { Field } from "../design-system/molecules/Field";
import { ProgressSteps } from "../design-system/molecules/ProgressSteps";
import { Segmented } from "../design-system/molecules/Segmented";
import { Stepper } from "../design-system/molecules/Stepper";
import { OnboardingLayout } from "../design-system/templates/OnboardingLayout";
import "./pages.css";

type CageSpec = Record<CageSize, { count: number; price: number }>;
const DEFAULT_SPEC: CageSpec = { S: { count: 6, price: 50_000 }, M: { count: 4, price: 75_000 }, L: { count: 2, price: 120_000 } };

/** One-tap starting points for the cage counts. Prices stay as the owner set them. */
const PRESETS = {
  home: { S: 4, M: 2, L: 0 },
  small: { S: 6, M: 4, L: 2 },
  large: { S: 14, M: 10, L: 6 },
} as const;
type PresetKey = keyof typeof PRESETS | "custom";

function matchPreset(spec: CageSpec): PresetKey {
  const hit = (Object.keys(PRESETS) as (keyof typeof PRESETS)[]).find((k) => SIZE_ORDER.every((s) => spec[s].count === PRESETS[k][s]));
  return hit ?? "custom";
}

type Step = 0 | 1 | 2 | 3;

/** A welcome, then three short steps: name the hotel, set up cages, pick a first task. */
export function OnboardingPage() {
  const { data, setHotel, setCages, loadSample } = useStore();
  const { t, locale } = useAppT();
  const o = t.onboarding;
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>(0);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [wa, setWa] = useState("");
  const [spec, setSpec] = useState<CageSpec>(DEFAULT_SPEC);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Already set up and not in the middle of this flow: go to the app.
  if (data.hotel && step !== 3) return <Navigate to="/app" replace />;

  const totalCages = SIZE_ORDER.reduce((n, s) => n + spec[s].count, 0);
  const prices = SIZE_ORDER.filter((s) => spec[s].count > 0).map((s) => spec[s].price);
  const fromPrice = prices.length ? Math.min(...prices) : 0;
  const preset = matchPreset(spec);

  function pickPreset(key: PresetKey) {
    if (key === "custom") return;
    const p = PRESETS[key];
    setSpec((prev) => ({ S: { ...prev.S, count: p.S }, M: { ...prev.M, count: p.M }, L: { ...prev.L, count: p.L } }));
  }

  function submitHotel(e: FormEvent) {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (!name.trim()) err.name = o.hotel.errName;
    if (wa.trim() && !normaliseWhatsapp(wa)) err.wa = o.hotel.errWhatsapp;
    setErrors(err);
    if (!Object.keys(err).length) setStep(2);
  }

  function submitCages(e: FormEvent) {
    e.preventDefault();
    if (totalCages === 0) {
      setErrors({ cages: o.cages.errNone });
      return;
    }
    setErrors({});
    setCages(generateCages(spec));
    setHotel({ name: name.trim(), city: city.trim(), whatsapp: normaliseWhatsapp(wa) ?? "", createdAt: new Date().toISOString() });
    setStep(3);
  }

  function useSample() {
    loadSample();
    navigate("/app");
  }

  const sampleLink = step < 3 && (
    <Button variant="ghost" size="sm" onClick={useSample}>
      {o.sample}
    </Button>
  );

  return (
    <OnboardingLayout aside={sampleLink}>
      {step > 0 && <ProgressSteps current={step} total={3} label={o.stepOf(step, 3)} />}

      {step === 0 && (
        <div className="pg-onb">
          <Illustration name="playing-time" height={160} />
          <div className="pg-onb__head pg-onb__head--center">
            <Heading level={1}>{o.welcome.title}</Heading>
            <Muted>{o.welcome.lead}</Muted>
          </div>
          <ol className="pg-onb__plan">
            {o.welcome.items.map((item, i) => (
              <li key={item.title}>
                <span className="pg-onb__num" aria-hidden="true">
                  {i + 1}
                </span>
                <span>
                  <b>{item.title}</b>
                  <small>{item.body}</small>
                </span>
              </li>
            ))}
          </ol>
          <Button size="lg" block icon="chevronRight" onClick={() => setStep(1)}>
            {o.welcome.start}
          </Button>
        </div>
      )}

      {step === 1 && (
        <form className="pg-onb" onSubmit={submitHotel} noValidate>
          <Illustration name="setup-store" />
          <div className="pg-onb__head pg-onb__head--center">
            <Heading level={1}>{o.hotel.title}</Heading>
            <Muted>{o.hotel.lead}</Muted>
          </div>
          <Field label={o.hotel.name} error={errors.name}>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={o.hotel.namePh} autoFocus autoComplete="organization" />
          </Field>
          <Field label={o.hotel.city} optional={t.common.optional}>
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder={o.hotel.cityPh} autoComplete="address-level2" />
          </Field>
          <Field label={o.hotel.whatsapp} hint={o.hotel.whatsappHint} error={errors.wa} optional={t.common.optional}>
            <Input value={wa} onChange={(e) => setWa(e.target.value)} placeholder="08xx xxxx xxxx" inputMode="tel" autoComplete="tel" />
          </Field>
          <div className="pg-onb__actions">
            <Button variant="secondary" icon="chevronLeft" onClick={() => setStep(0)}>
              {t.common.back}
            </Button>
            <Button type="submit" size="lg" icon="chevronRight">
              {o.hotel.next}
            </Button>
          </div>
        </form>
      )}

      {step === 2 && (
        <form className="pg-onb" onSubmit={submitCages} noValidate>
          <Illustration name="setup-price" />
          <div className="pg-onb__head pg-onb__head--center">
            <Heading level={1}>{o.cages.title}</Heading>
            <Muted>{o.cages.lead}</Muted>
          </div>
          <div className="pg-onb__presets">
            <Segmented
              label={o.cages.presets.label}
              value={preset}
              onChange={pickPreset}
              options={[
                { value: "home", label: o.cages.presets.home, count: 6 },
                { value: "small", label: o.cages.presets.small, count: 12 },
                { value: "large", label: o.cages.presets.large, count: 30 },
                { value: "custom", label: o.cages.presets.custom },
              ]}
            />
          </div>
          <div className="pg-onb__sizes">
            {SIZE_ORDER.map((s) => (
              <div className="pg-onb__size" key={s}>
                <div className="pg-onb__sizename">
                  <b>{t.common.sizes[s]}</b>
                  <span>{s}-01…</span>
                </div>
                <Stepper
                  label={`${t.common.sizes[s]} · ${o.cages.count}`}
                  value={spec[s].count}
                  onChange={(n) => setSpec({ ...spec, [s]: { ...spec[s], count: n } })}
                />
                <Field label={o.cages.price} hint={formatRupiah(spec[s].price, locale)}>
                  <Input
                    inputMode="numeric"
                    value={spec[s].price}
                    onChange={(e) => setSpec({ ...spec, [s]: { ...spec[s], price: parseInt(e.target.value.replace(/\D/g, "") || "0", 10) } })}
                  />
                </Field>
              </div>
            ))}
          </div>
          <p className="pg-onb__total">{o.cages.total(totalCages)}</p>
          {errors.cages && <Alert tone="danger">{errors.cages}</Alert>}
          <div className="pg-onb__actions">
            <Button variant="secondary" icon="chevronLeft" onClick={() => setStep(1)}>
              {t.common.back}
            </Button>
            <Button type="submit" size="lg" icon="check">
              {o.cages.next}
            </Button>
          </div>
        </form>
      )}

      {step === 3 && (
        <div className="pg-onb">
          <Illustration name="free-snacks" />
          <div className="pg-onb__head pg-onb__head--center">
            <Heading level={1}>{o.done.title(name.trim())}</Heading>
            <p className="pg-onb__summary">
              <Icon name="check" size={16} /> {o.done.summary(totalCages, formatRupiah(fromPrice, locale))}
            </p>
            <Muted>{o.done.lead}</Muted>
          </div>
          <div className="pg-onb__choices">
            <a className="pg-onb__choice" href="/app/bookings/new" onClick={(e) => (e.preventDefault(), navigate("/app/bookings/new"))}>
              <Icon name="bookings" size={22} />
              <span>
                <b>{o.done.firstBooking}</b>
                <small>{o.done.firstBookingHint}</small>
              </span>
              <Icon name="chevronRight" />
            </a>
            <a className="pg-onb__choice" href="/app/pets/new" onClick={(e) => (e.preventDefault(), navigate("/app/pets/new"))}>
              <Icon name="pets" size={22} />
              <span>
                <b>{o.done.firstPet}</b>
                <small>{o.done.firstPetHint}</small>
              </span>
              <Icon name="chevronRight" />
            </a>
          </div>
          <Button variant="ghost" onClick={() => navigate("/app")}>
            {o.done.dashboard}
          </Button>
        </div>
      )}
    </OnboardingLayout>
  );
}
