import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "@/shared/i18n/LocaleProvider";
import { addDays, todayISO } from "@/app/domain/logic";
import { modeKeyFor } from "@/app/mode/mode";
import { markBackedUp } from "@/app/store/backupNote";
import { dataKeyFor } from "@/app/store/storage";
import { signedInAs } from "@/app/testing/auth";
import { aBooking, aCareEntry, aPet, aSmallHotel } from "@/app/testing/fixtures";
import type { HotelData, Payment } from "@/app/domain/types";
import AppRoutes from "./AppRoutes";

const today = todayISO();
const stored = (): HotelData => JSON.parse(localStorage.getItem(dataKeyFor("acct-test")) ?? "null");
const paid = (amount: number, kind: Payment["kind"] = "payment"): Payment => ({ id: `p${amount}${kind}`, at: new Date().toISOString(), amount, method: "cash", kind, reference: "", note: "" });

async function open(path: string, data: HotelData) {
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

describe("retiring a unit", () => {
  it("archives a cage with past stays instead of deleting it, and can bring it back", async () => {
    const data = aSmallHotel({ bookings: [aBooking("old", { petId: "p1", cageId: "s1", checkIn: "2026-01-01", checkOut: "2026-01-03", status: "checked_out" })] });
    const user = await open("/app/cages", data);
    await user.click(await screen.findByRole("button", { name: /^S1/ }));
    await user.click(screen.getByRole("button", { name: /delete/i }));
    expect(await screen.findByText(/S1 has past stays, so it was archived/i)).toBeInTheDocument();
    expect(stored().cages.find((c) => c.id === "s1")).toMatchObject({ archived: true });
    expect(stored().bookings[0].cageId).toBe("s1");
    const archived = within(screen.getByRole("region", { name: "Archived" }));
    await user.click(archived.getByRole("button", { name: "Restore" }));
    expect(stored().cages.find((c) => c.id === "s1")).toMatchObject({ archived: false });
  });
});

describe("a pet with history", () => {
  it("can't be deleted, and says why", async () => {
    const data = aSmallHotel({ bookings: [aBooking("b1", { petId: "p1", cageId: "s1", checkIn: "2026-01-01", checkOut: "2026-01-03", status: "checked_out", payments: [paid(100_000)] })] });
    await open("/app/pets/p1", data);
    expect(await screen.findByText(/can't be deleted/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^delete$/i })).not.toBeInTheDocument();
  });
});

describe("the vaccination rule", () => {
  const withRule = (vaccineExpiry: string) => {
    const d = aSmallHotel({ pets: [aPet("p1", "o1", { name: "Mochi", vaccineExpiry })], bookings: [aBooking("b1", { petId: "p1", cageId: "s1", checkIn: today, checkOut: addDays(today, 2) })] });
    return { ...d, settings: { ...d.settings, requireVaccine: true } };
  };

  it("holds check-in until a valid card is seen, and records that it was", async () => {
    const user = await open("/app/bookings/b1", withRule("2020-01-01"));
    expect(await screen.findByText(/requires a valid vaccination/i)).toHaveTextContent("Mochi");
    await user.click(screen.getByRole("button", { name: /^check in$/i }));
    expect(screen.getByText(/check the vaccination card before checking in/i)).toBeInTheDocument();
    expect(stored()?.bookings[0].status ?? "booked").toBe("booked");
    await user.click(screen.getByLabelText(/seen a valid vaccination card/i));
    await user.click(screen.getByRole("button", { name: /^check in$/i }));
    expect(stored().bookings[0].status).toBe("checked_in");
    expect(stored().bookings[0].arrival?.notes).toMatch(/vaccination card seen/i);
  });

  it("doesn't get in the way of a pet whose vaccination is valid", async () => {
    await open("/app/bookings/b1", withRule(addDays(today, 200)));
    await screen.findByRole("button", { name: /^check in$/i });
    expect(screen.queryByText(/requires a valid vaccination/i)).not.toBeInTheDocument();
  });

  it("is switched on in Settings", async () => {
    const user = await open("/app/settings", aSmallHotel());
    await user.click(await screen.findByLabelText(/require a valid vaccination/i));
    await user.click(within(document.getElementById("business")!).getByRole("button", { name: /^save/i }));
    expect(stored().settings.requireVaccine).toBe(true);
  });
});

describe("money after a cancellation, and too much money", () => {
  it("still gives money back on a cancelled stay", async () => {
    const data = aSmallHotel({ bookings: [aBooking("b1", { petId: "p1", cageId: "s1", checkIn: today, checkOut: addDays(today, 2), status: "cancelled", cancelReason: "owner", payments: [paid(80_000, "deposit")] })] });
    const user = await open("/app/bookings/b1", data);
    const panel = within(await screen.findByRole("region", { name: /payments/i }));
    expect(panel.getByText(/80\.000 kept from this stay/)).toBeInTheDocument();
    await user.type(panel.getByLabelText(/amount/i), "30000");
    await user.click(panel.getByRole("button", { name: /save refund/i }));
    expect(stored().bookings[0].payments.at(-1)).toMatchObject({ kind: "refund", amount: 30_000 });
  });

  it("says when more than the total was paid, and offers to give it back", async () => {
    const data = aSmallHotel({ bookings: [aBooking("b1", { petId: "p1", cageId: "s1", checkIn: today, checkOut: addDays(today, 2), payments: [paid(130_000)] })] });
    const user = await open("/app/bookings/b1", data);
    const panel = within(await screen.findByRole("region", { name: /payments/i }));
    expect(panel.getByText(/30\.000 more than the total was paid/)).toBeInTheDocument();
    await user.click(panel.getByRole("button", { name: "Give it back" }));
    expect(panel.getByLabelText(/amount/i)).toHaveValue("30.000");
  });
});

describe("keeping the records safe", () => {
  const busy = () => aSmallHotel({ bookings: [aBooking("b1", { petId: "p1", cageId: "s1", checkIn: today, checkOut: addDays(today, 2) })] });

  it("reminds to download a backup when there has never been one", async () => {
    await open("/app", busy());
    expect(await screen.findByText(/haven't downloaded a backup yet/i)).toBeInTheDocument();
  });

  it("stays quiet after a recent backup", async () => {
    markBackedUp("acct-test", addDays(today, -2));
    await open("/app", busy());
    await screen.findByRole("heading", { name: "Today", level: 1 });
    expect(screen.queryByText(/backup/i)).not.toBeInTheDocument();
  });

  it("lists this week's incidents on the dashboard", async () => {
    const data = { ...busy(), careLog: [aCareEntry("c1", "b1", { kind: "incident", preset: null, note: "Muntah sekali", at: new Date().toISOString() })] };
    await open("/app/dashboard", data);
    const panel = within(await screen.findByRole("region", { name: /incidents this week/i }));
    expect(panel.getByText(/Muntah sekali/)).toBeInTheDocument();
    expect(panel.getByRole("link", { name: "Pet p1" })).toHaveAttribute("href", "/app/bookings/b1#care");
  });
});
