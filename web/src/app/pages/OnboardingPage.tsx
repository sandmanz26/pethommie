import { useRef, useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import type { CageSize } from "@/app/domain/types";
import { formatRupiah, generateCages, newId, poolCage, SIZE_ORDER } from "@/app/domain/logic";
import { formatWhatsapp, normaliseWhatsapp } from "@/shared/lib/phone";
import { cageIssues, hasIssues, hotelIssues, poolIssues, roomIssues, SETUP_LIMITS, type LengthIssue, type PriceIssue, type RoomDraft } from "./onboardingRules";
import { useAccount } from "@/app/auth/AuthProvider";
import { useStore } from "@/app/store/AppStore";
import { useMode } from "@/app/mode/ModeProvider";
import { useAppT } from "@/app/i18n/useAppT";
import { Button } from "@/app/design-system/atoms/Button";
import { Icon } from "@/app/design-system/atoms/Icon";
import { MoneyInput } from "@/app/design-system/atoms/MoneyInput";
import { Input } from "@/app/design-system/atoms/Input";
import { Illustration } from "@/app/design-system/atoms/Illustration";
import { Heading, Muted } from "@/app/design-system/atoms/Text";
import { Alert } from "@/app/design-system/molecules/Alert";
import { Field } from "@/app/design-system/molecules/Field";
import { ProgressSteps } from "@/app/design-system/molecules/ProgressSteps";
import { Segmented } from "@/app/design-system/molecules/Segmented";
import { Stepper } from "@/app/design-system/molecules/Stepper";
import { FocusLayout } from "@/app/design-system/templates/FocusLayout";
import "./pages.css";

type CageSpec = Record<CageSize, { count: number; price: number }>;
/** Typing a price keeps digits only; an empty field reads as 0, which the rules then refuse. */
const digits = (text: string) => parseInt(text.replace(/\D/g, "") || "0", 10);
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
  const { data, setHotel, setCages, saveSettings, loadSample } = useStore();
  const { mode } = useMode();
  const { t, locale } = useAppT();
  const o = t.onboarding;
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>(0);
  const account = useAccount();
  const [name, setName] = useState(account.hotelName);
  const [city, setCity] = useState("");
  const [wa, setWa] = useState(formatWhatsapp(account.whatsapp));
  const [spec, setSpec] = useState<CageSpec>(DEFAULT_SPEC);
  // Cage-free hotels (home boarding, play rooms) set up shared rooms instead: a name, places, a price per pet.
  // No cages or rooms at all ("none"): just how many pets at once and a price per pet.
  const [layout, setLayout] = useState<"cages" | "rooms" | "none">("cages");
  const [pool, setPool] = useState({ capacity: 10, price: 60_000 });
  const [rooms, setRooms] = useState<RoomDraft[]>(() => [
    { name: o.cages.defaultRooms[0], places: 8, price: 60_000 },
    { name: o.cages.defaultRooms[1], places: 6, price: 85_000 },
  ]);
  // Problems show after a first try to continue, then update as they are fixed.
  const [tried, setTried] = useState<{ hotel?: boolean; cages?: boolean }>({});
  const formRef = useRef<HTMLFormElement>(null);
  const focus = (field: string) => formRef.current?.querySelector<HTMLElement>(`[name="${field}"]`)?.focus();

  // Already set up and not in the middle of this flow: go to the app.
  if (data.hotel && step !== 3) return <Navigate to="/app" replace />;

  const totalCages = SIZE_ORDER.reduce((n, s) => n + spec[s].count, 0);
  const totalPlacesInRooms = rooms.reduce((n, r) => n + r.places, 0);
  const prices = layout === "none" ? [pool.price] : layout === "rooms" ? rooms.map((r) => r.price) : SIZE_ORDER.filter((s) => spec[s].count > 0).map((s) => spec[s].price);
  const fromPrice = prices.length ? Math.min(...prices) : 0;
  const preset = matchPreset(spec);

  function pickPreset(key: PresetKey) {
    if (key === "custom") return;
    const p = PRESETS[key];
    setSpec((prev) => ({ S: { ...prev.S, count: p.S }, M: { ...prev.M, count: p.M }, L: { ...prev.L, count: p.L } }));
  }

  const rupiah = (n: number) => formatRupiah(n, locale);
  const [minPrice, maxPrice] = SETUP_LIMITS.price;
  const lengthText = (issue: LengthIssue | undefined, [min, max]: readonly [number, number], required: string) =>
    issue === "required" ? required : issue === "short" ? o.hotel.errNameShort(min) : issue === "long" ? o.hotel.errTooLong(max) : undefined;
  const priceText = (issue?: PriceIssue) => (issue === "low" ? o.cages.errPriceLow(rupiah(minPrice)) : issue === "high" ? o.cages.errPriceHigh(rupiah(maxPrice)) : undefined);

  const hotelCheck = hotelIssues({ name, city, whatsapp: wa });
  const hotelErrors = tried.hotel
    ? {
        name: lengthText(hotelCheck.name, SETUP_LIMITS.hotelName, o.hotel.errName),
        city: hotelCheck.city && o.hotel.errTooLong(SETUP_LIMITS.city),
        wa: hotelCheck.whatsapp && o.hotel.errWhatsapp,
      }
    : {};
  const cageCheck = cageIssues(spec);
  const roomCheck = roomIssues(rooms);
  const poolCheck = poolIssues(pool);
  const showCages = !!tried.cages;
  const roomNameText = (issue: LengthIssue | "duplicate" | undefined) => {
    if (issue === "duplicate") return o.cages.errRoomDuplicate;
    if (issue === "required") return o.cages.errRoomName;
    if (issue === "short") return o.cages.errRoomNameShort(SETUP_LIMITS.roomName[0]);
    if (issue === "long") return o.cages.errRoomNameLong(SETUP_LIMITS.roomName[1]);
    return undefined;
  };

  function submitHotel(e: FormEvent) {
    e.preventDefault();
    setTried((x) => ({ ...x, hotel: true }));
    if (hasIssues(hotelCheck)) return focus(hotelCheck.name ? "name" : hotelCheck.city ? "city" : "whatsapp");
    setStep(2);
  }

  function submitCages(e: FormEvent) {
    e.preventDefault();
    setTried((x) => ({ ...x, cages: true }));
    if (layout === "none") {
      if (hasIssues(poolCheck)) return focus(poolCheck.capacity ? "pool-capacity" : "pool-price");
      setCages([poolCage(pool.capacity, pool.price, t.pool.unitName)]);
      saveSettings({ ...data.settings, unitTerm: "none" });
    } else if (layout === "rooms") {
      if (hasIssues(roomCheck)) {
        const i = roomCheck.rooms.findIndex((r) => hasIssues(r));
        const r = roomCheck.rooms[i];
        return i >= 0 && focus(`room-${i}-${r.name ? "name" : r.price ? "price" : "places"}`);
      }
      setCages(rooms.map((r) => ({ id: newId(), name: r.name.trim(), size: "M", pricePerNight: r.price, capacity: r.places, archived: false })));
      saveSettings({ ...data.settings, unitTerm: "room" });
    } else {
      if (hasIssues(cageCheck)) {
        const size = SIZE_ORDER.find((x) => cageCheck.price?.[x]);
        return size && focus(`price-${size}`);
      }
      setCages(generateCages(spec));
      saveSettings({ ...data.settings, unitTerm: "cage" });
    }
    setHotel({ name: name.trim(), city: city.trim(), whatsapp: normaliseWhatsapp(wa) ?? "", createdAt: new Date().toISOString() });
    setStep(3);
  }

  function useSample() {
    loadSample(mode);
    navigate("/app");
  }

  const sampleLink = step < 3 && (
    <Button variant="ghost" size="sm" onClick={useSample}>
      {o.sample}
    </Button>
  );

  return (
    <FocusLayout aside={sampleLink}>
      {step > 0 && <ProgressSteps current={step} total={3} label={o.stepOf(step, 3)} />}

      {step === 0 && (
        <div className="pg-flow">
          <Illustration name="app-welcome" height={170} />
          <div className="pg-flow__head pg-flow__head--center">
            <Heading level={1}>{o.welcome.title}</Heading>
            <Muted>{o.welcome.lead}</Muted>
          </div>
          <ol className="pg-flow__plan">
            {o.welcome.items.map((item, i) => (
              <li key={item.title}>
                <span className="pg-flow__num" aria-hidden="true">
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
        <form ref={formRef} className="pg-flow" onSubmit={submitHotel} noValidate>
          <Illustration name="app-hotel" height={140} />
          <div className="pg-flow__head pg-flow__head--center">
            <Heading level={1}>{o.hotel.title}</Heading>
            <Muted>{o.hotel.lead}</Muted>
          </div>
          <Field label={o.hotel.name} error={hotelErrors.name}>
            <Input name="name" value={name} maxLength={SETUP_LIMITS.hotelName[1] + 10} onChange={(e) => setName(e.target.value)} placeholder={o.hotel.namePh} autoFocus autoComplete="organization" />
          </Field>
          <Field label={o.hotel.city} optional={t.common.optional} error={hotelErrors.city}>
            <Input name="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder={o.hotel.cityPh} autoComplete="address-level2" />
          </Field>
          <Field label={o.hotel.whatsapp} hint={o.hotel.whatsappHint} error={hotelErrors.wa} optional={t.common.optional}>
            <Input name="whatsapp" value={wa} onChange={(e) => setWa(e.target.value)} placeholder="08xx xxxx xxxx" inputMode="tel" autoComplete="tel" />
          </Field>
          <div className="pg-flow__actions">
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
        <form ref={formRef} className="pg-flow" onSubmit={submitCages} noValidate>
          <Illustration name="app-cages" height={130} />
          <div className="pg-flow__head pg-flow__head--center">
            <Heading level={1}>{o.cages.title}</Heading>
            <Muted>{o.cages.lead}</Muted>
          </div>
          <Segmented
            label={o.cages.layout.label}
            value={layout}
            onChange={(v) => (setLayout(v), setTried((x) => ({ ...x, cages: false })))}
            options={[
              { value: "cages", label: o.cages.layout.cages },
              { value: "rooms", label: o.cages.layout.rooms },
              { value: "none", label: o.cages.layout.none },
            ]}
          />
          {layout === "none" ? (
            <>
              <Muted>{o.cages.noneLead}</Muted>
              <div className="pg-flow__sizes">
                <div className="pg-flow__size pg-flow__room">
                  <Field label={o.cages.capacity} error={showCages && poolCheck.capacity ? o.cages.errPlaces(...SETUP_LIMITS.capacity) : undefined}>
                    <Input name="pool-capacity" inputMode="numeric" value={pool.capacity || ""} onChange={(e) => setPool({ ...pool, capacity: digits(e.target.value) })} />
                  </Field>
                  <Field label={o.cages.pricePerPet} hint={formatRupiah(pool.price, locale)} error={showCages ? priceText(poolCheck.price) : undefined}>
                    <MoneyInput name="pool-price" value={pool.price || ""} onChange={(e) => setPool({ ...pool, price: digits(e.target.value) })} />
                  </Field>
                </div>
              </div>
            </>
          ) : layout === "rooms" ? (
            <>
              <Muted>{o.cages.roomsLead}</Muted>
              <div className="pg-flow__sizes">
                {rooms.map((r, i) => (
                  <div className="pg-flow__size pg-flow__room" key={i}>
                    <Field label={o.cages.roomName} error={showCages ? roomNameText(roomCheck.rooms[i]?.name) : undefined}>
                      <Input name={`room-${i}-name`} maxLength={SETUP_LIMITS.roomName[1] + 10} value={r.name} onChange={(e) => setRooms(rooms.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)))} />
                    </Field>
                    <div className="pg-flow__places">
                      <Stepper
                        label={`${r.name || o.cages.roomName} · ${o.cages.places}`}
                        value={r.places}
                        min={1}
                        max={SETUP_LIMITS.places[1]}
                        onChange={(n) => setRooms(rooms.map((x, k) => (k === i ? { ...x, places: n } : x)))}
                      />
                      {showCages && roomCheck.rooms[i]?.places && (
                        <p className="ds-field__error" role="alert">
                          {o.cages.errPlaces(...SETUP_LIMITS.places)}
                        </p>
                      )}
                    </div>
                    <Field label={o.cages.pricePerPet} hint={formatRupiah(r.price, locale)} error={showCages ? priceText(roomCheck.rooms[i]?.price) : undefined}>
                      <MoneyInput name={`room-${i}-price`} value={r.price || ""} onChange={(e) => setRooms(rooms.map((x, k) => (k === i ? { ...x, price: digits(e.target.value) } : x)))} />
                    </Field>
                    {rooms.length > 1 && (
                      <Button variant="ghost" size="sm" icon="trash" aria-label={o.cages.removeRoom(r.name)} onClick={() => setRooms(rooms.filter((_, k) => k !== i))} />
                    )}
                  </div>
                ))}
              </div>
              <Button variant="secondary" size="sm" icon="plus" onClick={() => setRooms([...rooms, { name: "", places: 4, price: rooms.at(-1)?.price ?? 60_000 }])}>
                {o.cages.addRoom}
              </Button>
              <p className="pg-flow__total">{o.cages.roomsTotal(totalPlacesInRooms)}</p>
            </>
          ) : (
            <>
              <div className="pg-flow__presets">
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
              <div className="pg-flow__sizes">
                {SIZE_ORDER.map((s) => (
                  <div className="pg-flow__size" key={s}>
                    <div className="pg-flow__sizename">
                      <b>{t.common.sizes[s]}</b>
                      <span>{s}-01…</span>
                    </div>
                    <Stepper
                      label={`${t.common.sizes[s]} · ${o.cages.count}`}
                      value={spec[s].count}
                      onChange={(n) => setSpec({ ...spec, [s]: { ...spec[s], count: n } })}
                    />
                    <Field label={o.cages.price} hint={formatRupiah(spec[s].price, locale)} error={showCages ? priceText(cageCheck.price?.[s]) : undefined}>
                      <MoneyInput name={`price-${s}`} value={spec[s].price || ""} onChange={(e) => setSpec({ ...spec, [s]: { ...spec[s], price: digits(e.target.value) } })} />
                    </Field>
                  </div>
                ))}
              </div>
              <p className="pg-flow__total">{o.cages.total(totalCages)}</p>
            </>
          )}
          {showCages && (layout === "none" ? hasIssues(poolCheck) : layout === "rooms" ? roomCheck.none || hasIssues(roomCheck) : hasIssues(cageCheck)) && (
            <Alert tone="danger">{layout === "cages" && cageCheck.none ? o.cages.errNone : o.cages.errFix}</Alert>
          )}
          <div className="pg-flow__actions">
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
        <div className="pg-flow">
          <Illustration name="app-done" height={160} />
          <div className="pg-flow__head pg-flow__head--center">
            <Heading level={1}>{o.done.title(name.trim())}</Heading>
            <p className="pg-flow__summary">
              <Icon name="check" size={16} /> {layout === "none" ? o.done.summaryNone(pool.capacity, formatRupiah(pool.price, locale)) : layout === "rooms" ? o.done.summaryRooms(totalPlacesInRooms, formatRupiah(fromPrice, locale)) : o.done.summary(totalCages, formatRupiah(fromPrice, locale))}
            </p>
            <Muted>{o.done.lead}</Muted>
          </div>
          <div className="pg-flow__choices">
            {/* Booking rules first: a new booking needs them (see BookingNewPage). */}
            <a className="pg-flow__choice" href="/app/settings/booking" onClick={(e) => (e.preventDefault(), navigate("/app/settings/booking"))}>
              <Icon name="settings" size={22} />
              <span>
                <b>{o.done.bookingRules}</b>
                <small>{o.done.bookingRulesHint}</small>
              </span>
              <Icon name="chevronRight" />
            </a>
            <a className="pg-flow__choice" href="/app/bookings/new" onClick={(e) => (e.preventDefault(), navigate("/app/bookings/new"))}>
              <Icon name="bookings" size={22} />
              <span>
                <b>{o.done.firstBooking}</b>
                <small>{o.done.firstBookingHint}</small>
              </span>
              <Icon name="chevronRight" />
            </a>
            <a className="pg-flow__choice" href="/app/pets/new" onClick={(e) => (e.preventDefault(), navigate("/app/pets/new"))}>
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
    </FocusLayout>
  );
}
