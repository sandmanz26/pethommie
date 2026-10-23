import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "@/shared/i18n/LocaleProvider";
import { choose } from "@/shared/testing/select";
import { addDays, todayISO } from "@/app/domain/logic";
import { modeKeyFor } from "@/app/mode/mode";
import { dataKeyFor } from "@/app/store/storage";
import { signedInAs } from "@/app/testing/auth";
import { aBooking, aSmallHotel } from "@/app/testing/fixtures";
import type { HotelData, PayMode } from "@/app/domain/types";
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

const rules = () => within(document.getElementById("booking-rules")!);

/** Sets the hotel's rule in Settings and saves it. */
async function setRule(mode: PayMode, percent?: string) {
  const user = await open("/app/settings", aSmallHotel());
  await screen.findByRole("heading", { name: "Booking & payment rules" });
  const label = { flexible: "Book now, pay later", deposit_first: "Deposit first", check_first: "Check slot first" }[mode];
  await user.click(rules().getByRole("tab", { name: label }));
  if (percent !== undefined) {
    await user.clear(rules().getByLabelText(/minimum deposit/i));
    await user.type(rules().getByLabelText(/minimum deposit/i), percent);
  }
  await user.click(rules().getByRole("button", { name: /^save$/i }));
  return user;
}

/** Books s1 for two nights from today (Rp100.000) for a new owner, through the form. Returns the info line under the deposit. */
async function bookNew(data: HotelData) {
  const user = await open("/app/bookings/new", data);
  await user.click(await screen.findByRole("button", { name: /^new owner$/i }));
  await user.type(screen.getByLabelText(/owner name/i), "Dewi");
  await user.type(screen.getByLabelText(/owner whatsapp/i), "0857 1122 3344");
  await user.type(screen.getByLabelText(/pet's name/i), "Boba");
  await choose(user, screen.getByLabelText(/^cage ·/i), "s1");
  const info = screen.getByLabelText(/deposit paid/i).getAttribute("aria-describedby");
  const text = document.getElementById(info!)!.textContent;
  await user.click(screen.getByRole("button", { name: /save booking/i }));
  await screen.findByRole("heading", { name: /^bookings$/i });
  return text;
}

describe("the booking and payment rules", () => {
  it("validates the deposit percent and keeps the rule on its own", async () => {
    await setRule("deposit_first", "120");
    expect(rules().getByText("Enter a whole number from 0 to 100.")).toBeInTheDocument();
    expect(stored()?.settings.payPolicy.mode ?? "flexible").toBe("flexible");
    const user = userEvent.setup();
    await user.clear(rules().getByLabelText(/minimum deposit/i));
    await user.type(rules().getByLabelText(/minimum deposit/i), "40");
    await user.click(rules().getByRole("button", { name: /^save$/i }));
    expect(stored().settings.payPolicy).toEqual({ mode: "deposit_first", depositPercent: 40 });
    // saving the business details afterwards doesn't undo it
    await user.click(within(document.getElementById("business")!).getByRole("button", { name: /^save/i }));
    expect(stored().settings.payPolicy).toEqual({ mode: "deposit_first", depositPercent: 40 });
  });

  it("flexible: a new booking is confirmed and can check in", async () => {
    await setRule("flexible");
    expect(rules().getByText(/confirmed right away/i)).toBeInTheDocument();
    expect(rules().queryByLabelText(/minimum deposit/i)).not.toBeInTheDocument();
    expect(await bookNew(stored())).toMatch(/confirmed right away/i);
    const b = stored().bookings[0];
    expect(b.hold).toBeUndefined();
    await open(`/app/bookings/${b.id}`, stored());
    expect(await screen.findByRole("button", { name: /^check in$/i })).toBeInTheDocument();
  });

  it("deposit first: the booking waits for the deposit, which confirms it", async () => {
    await setRule("deposit_first", "30");
    expect(await bookNew(stored())).toMatch(/Minimum deposit Rp\s?30\.000 \(30%\)/);
    const b = stored().bookings[0];
    expect(b.hold).toBe("deposit");

    const user = await open(`/app/bookings/${b.id}`, stored());
    expect(await screen.findByText(/Awaiting deposit Rp\s?30\.000/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^check in$/i })).not.toBeInTheDocument();
    const panel = within(screen.getByRole("region", { name: /payments/i }));
    await user.type(panel.getByLabelText(/amount/i), "30000");
    await user.click(panel.getByRole("button", { name: /save payment/i }));
    expect(stored().bookings[0].hold).toBeUndefined();
    expect(await screen.findByRole("button", { name: /^check in$/i })).toBeInTheDocument();
  });

  it("check first: the booking is a request; confirming the slot, then paying, lets it check in", async () => {
    await setRule("check_first", "30");
    expect(await bookNew(stored())).toMatch(/saved as a request/i);
    const b = stored().bookings[0];
    expect(b.hold).toBe("request");
    // the list shows it as a request, with no check-in button
    expect(screen.getByText("Request")).toBeInTheDocument();

    const user = await open(`/app/bookings/${b.id}`, stored());
    expect(await screen.findByText(/booking request/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^check in$/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirm slot" }));
    expect(stored().bookings[0].hold).toBe("deposit");
    expect(await screen.findByText(/Awaiting deposit Rp\s?30\.000/)).toBeInTheDocument();
    const panel = within(screen.getByRole("region", { name: /payments/i }));
    await user.type(panel.getByLabelText(/amount/i), "30000");
    await user.click(panel.getByRole("button", { name: /save payment/i }));
    expect(await screen.findByRole("button", { name: /^check in$/i })).toBeInTheDocument();
  });

  it("check first: says so when the slot was taken meanwhile", async () => {
    const data = aSmallHotel({
      settings: { ...aSmallHotel().settings, payPolicy: { mode: "check_first", depositPercent: 30 } },
      bookings: [
        aBooking("req", { petId: "p1", cageId: "s1", checkIn: today, checkOut: addDays(today, 2), hold: "request" }),
        aBooking("other", { petId: "p2", cageId: "s1", checkIn: today, checkOut: addDays(today, 1) }),
      ],
    });
    const user = await open("/app/bookings/req", data);
    await user.click(await screen.findByRole("button", { name: "Confirm slot" }));
    expect(screen.getByText(/already taken/i)).toBeInTheDocument();
    expect(stored()?.bookings.find((x) => x.id === "req")?.hold ?? "request").toBe("request");
  });

  it("the Today board shows held arrivals with their badge and no one-tap check-in", async () => {
    const data = aSmallHotel({
      bookings: [
        aBooking("req", { petId: "p1", cageId: "s1", checkIn: today, checkOut: addDays(today, 2), hold: "request" }),
        aBooking("dp", { petId: "p2", cageId: "s2", checkIn: today, checkOut: addDays(today, 2), hold: "deposit" }),
      ],
    });
    await open("/app", data);
    expect(await screen.findByText("Request")).toBeInTheDocument();
    expect(screen.getByText("Awaiting deposit")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^check in$/i })).not.toBeInTheDocument();
  });
});

it("speaks Indonesian too", async () => {
  const { appId } = await import("@/app/i18n/id");
  expect(appId.payPolicy.badge).toEqual({ request: "Permintaan", deposit: "Menunggu DP" });
  expect(appId.payPolicy.formInfo.deposit_first("Rp 30.000", 30)).toBe("DP minimal Rp 30.000 (30%). Tanpa DP ini, booking menunggu DP dan belum bisa check-in.");
});
