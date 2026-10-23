import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "@/shared/i18n/LocaleProvider";
import { choose } from "@/shared/testing/select";
import { addDays, todayISO } from "@/app/domain/logic";
import { defaultStayRules, type HotelData, type StayRules } from "@/app/domain/types";
import { modeKeyFor } from "@/app/mode/mode";
import { dataKeyFor } from "@/app/store/storage";
import { signedInAs } from "@/app/testing/auth";
import { aBooking, aSmallHotel } from "@/app/testing/fixtures";
import AppRoutes from "./AppRoutes";

const today = todayISO();
const stored = (): HotelData => JSON.parse(localStorage.getItem(dataKeyFor("acct-test")) ?? "null");

async function open(path: string, data: HotelData) {
  cleanup();
  await signedInAs({ data });
  localStorage.setItem(modeKeyFor("acct-test"), "advanced");
  const user = userEvent.setup();
  render(
    <LocaleProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/app/*" element={<AppRoutes />} />
        </Routes>
      </MemoryRouter>
    </LocaleProvider>,
  );
  return user;
}

const withRules = (rules: Partial<StayRules>, parts: Partial<HotelData> = {}): HotelData => {
  const base = aSmallHotel(parts);
  return { ...base, settings: { ...base.settings, stayRules: { ...defaultStayRules(true), ...rules } } };
};

describe("booking settings before the first booking", () => {
  it("shows a gate instead of the booking form until the rules are set, then goes back to the form", async () => {
    const user = await open("/app/bookings/new?cage=s1", withRules({ configured: false }));
    expect(await screen.findByRole("heading", { name: "Set your booking rules first" })).toBeInTheDocument();
    expect(screen.queryByLabelText(/check-in/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: /set booking rules/i }));
    await screen.findByRole("heading", { name: "Booking settings", level: 1 });
    await user.click(screen.getByRole("tab", { name: "Per calendar day" }));
    expect(screen.getByText(/Mon → Wed is 3 days/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Back to the new booking" }));

    // Back on the form, which now counts calendar days and shows the hours.
    expect(await screen.findByLabelText(/check-in/i)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Set your booking rules first" })).not.toBeInTheDocument();
    expect(screen.getByText("Drop-off 08:00–20:00 · pick up by 12:00")).toBeInTheDocument();
    expect(screen.getByText(/^\d+ days?$/)).toBeInTheDocument();
    expect(stored().settings.stayRules).toMatchObject({ configured: true, counting: "calendar_days" });
  });

  it("lets a set-up hotel book straight away", async () => {
    await open("/app/bookings/new", aSmallHotel());
    expect(await screen.findByLabelText(/check-in/i)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Set your booking rules first" })).not.toBeInTheDocument();
  });

  it("is linked from Settings", async () => {
    const user = await open("/app/settings", aSmallHotel());
    await screen.findByRole("heading", { name: "Settings", level: 1 });
    await user.click(within(document.getElementById("booking-settings")!).getByRole("link", { name: "Booking settings" }));
    expect(await screen.findByRole("heading", { name: "Booking settings", level: 1 })).toBeInTheDocument();
  });
});

describe("after onboarding", () => {
  it("offers the booking rules first; a new hotel's first booking waits for them", async () => {
    cleanup();
    await signedInAs({ account: { hotelName: "Rumah Meong", whatsapp: "6281234567890" } });
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <MemoryRouter initialEntries={["/app"]}>
          <Routes>
            <Route path="/app/*" element={<AppRoutes />} />
          </Routes>
        </MemoryRouter>
      </LocaleProvider>,
    );
    await user.click(await screen.findByRole("button", { name: /start setup/i }));
    await user.click(screen.getByRole("button", { name: /next: your cages/i }));
    await user.click(screen.getByRole("button", { name: /finish setup/i }));
    await screen.findByRole("heading", { name: /rumah meong is ready/i });
    expect(stored().settings.stayRules.configured).toBe(false);
    const choices = screen.getAllByRole("link").filter((l) => l.classList.contains("pg-flow__choice"));
    expect(choices[0]).toHaveTextContent("Set your booking rules");
    await user.click(choices[0]);
    expect(await screen.findByRole("heading", { name: "Booking settings", level: 1 })).toBeInTheDocument();
  });
});

describe("booking settings validation", () => {
  it("checks every input and saves nothing until all are right", async () => {
    const user = await open("/app/settings/booking", withRules({ configured: false }));
    await screen.findByRole("heading", { name: "Booking settings", level: 1 });
    const form = within(document.getElementById("stay-rules")!);
    fireEvent.change(form.getByLabelText("Drop-off from"), { target: { value: "21:00" } });
    await user.clear(form.getByLabelText(/grace period/i));
    await user.type(form.getByLabelText(/grace period/i), "300");
    await choose(user, form.getByLabelText(/when a pet is picked up late/i), "per_hour");
    await user.clear(form.getByLabelText(/fee per started hour/i));
    await user.click(form.getByRole("button", { name: "Save booking settings" }));

    expect(form.getByText('"From" must be earlier than "until".')).toBeInTheDocument();
    expect(form.getByText("Enter a whole number from 0 to 240.")).toBeInTheDocument();
    expect(form.getByText("Enter an amount.")).toBeInTheDocument();
    expect(stored()?.settings.stayRules.configured ?? false).toBe(false);

    fireEvent.change(form.getByLabelText("Drop-off from"), { target: { value: "07:30" } });
    await user.clear(form.getByLabelText(/grace period/i));
    await user.type(form.getByLabelText(/grace period/i), "15");
    await user.type(form.getByLabelText(/fee per started hour/i), "100000001");
    await user.click(form.getByRole("button", { name: "Save booking settings" }));
    expect(form.getByText(/That's more than/)).toBeInTheDocument();
    expect(stored()?.settings.stayRules.configured ?? false).toBe(false);

    await user.clear(form.getByLabelText(/fee per started hour/i));
    await user.type(form.getByLabelText(/fee per started hour/i), "15000");
    await user.click(form.getByRole("button", { name: "Save booking settings" }));
    expect(form.getByText("Saved.")).toBeInTheDocument();
    expect(stored().settings.stayRules).toEqual({ ...defaultStayRules(true), dropOffFrom: "07:30", graceMinutes: 15, late: { mode: "per_hour", perHour: 15_000 } });
  });
});

describe("late pick-up at check-out", () => {
  // Pick-up by midnight with no grace, so any time today is late; Rp10.000 an hour, at most a day (Rp50.000).
  const lateRules = { pickUpUntil: "00:00", graceMinutes: 0, late: { mode: "per_hour" as const, perHour: 10_000 } };
  const paid = [{ id: "d", at: new Date().toISOString(), amount: 50_000, method: "cash" as const, kind: "payment" as const, reference: "", note: "" }];
  const leaving = aBooking("b1", { petId: "p1", cageId: "s1", checkIn: addDays(today, -1), checkOut: today, status: "checked_in", payments: paid });

  it("proposes the late fee as a charge, which can be changed", async () => {
    const user = await open("/app/bookings/b1", withRules(lateRules, { bookings: [leaving] }));
    await user.click(await screen.findByRole("button", { name: /^check out$/i }));
    const dialog = within(await screen.findByRole("dialog"));
    fireEvent.change(dialog.getByLabelText("Picked up at"), { target: { value: "03:30" } });
    expect(dialog.getByText("Picked up 210 minutes after the limit (00:00).")).toBeInTheDocument();
    expect(dialog.getByLabelText("Add the late pick-up fee")).toBeChecked();
    expect(dialog.getByLabelText("Late pick-up fee")).toHaveValue("40.000");
    expect(dialog.getByText(/still owed after this: Rp\s?40\.000/i)).toBeInTheDocument();
    await user.clear(dialog.getByLabelText("Late pick-up fee"));
    await user.type(dialog.getByLabelText("Late pick-up fee"), "25000");
    await user.click(dialog.getByRole("button", { name: /check out anyway/i }));
    expect(stored().bookings[0]).toMatchObject({ status: "checked_out", charges: [{ label: "Late pick-up fee", amount: 25_000 }] });
  });

  it("can be skipped", async () => {
    const user = await open("/app/bookings/b1", withRules(lateRules, { bookings: [leaving] }));
    await user.click(await screen.findByRole("button", { name: /^check out$/i }));
    const dialog = within(await screen.findByRole("dialog"));
    await user.click(dialog.getByLabelText("Add the late pick-up fee"));
    expect(dialog.getByText(/nothing is owed/i)).toBeInTheDocument();
    await user.click(dialog.getByRole("button", { name: /^check out$/i }));
    expect(stored().bookings[0]).toMatchObject({ status: "checked_out", charges: [] });
  });

  it("asks nothing when the hotel charges no late fee and nothing is owed", async () => {
    const user = await open("/app/bookings/b1", withRules({ ...lateRules, late: { mode: "none", perHour: 10_000 } }, { bookings: [leaving] }));
    await user.click(await screen.findByRole("button", { name: /^check out$/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(stored().bookings[0]).toMatchObject({ status: "checked_out", charges: [] });
  });
});
