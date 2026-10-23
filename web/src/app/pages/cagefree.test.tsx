import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "@/shared/i18n/LocaleProvider";
import { addDays, formatDate, todayISO } from "@/app/domain/logic";
import { defaultSettings, emptyData, type HotelData } from "@/app/domain/types";
import { dataKeyFor } from "@/app/store/storage";
import { signedInAs } from "@/app/testing/auth";
import { aBooking, aCage, aPet, aSmallHotel, anOwner } from "@/app/testing/fixtures";
import AppRoutes from "./AppRoutes";

function renderApp(path: string) {
  return render(
    <LocaleProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/app/*" element={<AppRoutes />} />
        </Routes>
      </MemoryRouter>
    </LocaleProvider>,
  );
}
const stored = (): HotelData => JSON.parse(localStorage.getItem(dataKeyFor("acct-test")) ?? "null");
const today = todayISO();

describe("a cage-free hotel", () => {
  it("sets up shared rooms instead of cages, and calls them rooms", async () => {
    await signedInAs({ data: emptyData() });
    const user = userEvent.setup();
    renderApp("/app/onboarding");
    await user.click(await screen.findByRole("button", { name: /start setup/i }));
    await user.click(screen.getByRole("button", { name: /next/i }));
    await user.click(screen.getByRole("tab", { name: "Shared rooms, no cages" }));
    expect(screen.getByText("14 places in total")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /finish setup/i }));
    const data = stored();
    expect(data.cages.map((c) => [c.name, c.capacity, c.pricePerNight])).toEqual([["Cat room", 8, 60_000], ["Dog room", 6, 85_000]]);
    expect(data.settings.unitTerm).toBe("room");
    expect(await screen.findByText(/14 places in shared rooms/)).toBeInTheDocument();
  });

  it("books pets into a shared room until it is full, and shows its places on the calendar", async () => {
    const room = aCage("room", "M", 60_000, 2);
    const data = aSmallHotel({
      settings: { ...defaultSettings(), unitTerm: "room" },
      cages: [room],
      owners: [anOwner("o1"), anOwner("o2"), anOwner("o3")],
      pets: [aPet("p1", "o1", { name: "Mochi" }), aPet("p2", "o2", { name: "Kopi" }), aPet("p3", "o3", { name: "Nala" })],
      bookings: [aBooking("b1", { petId: "p1", cageId: "room", checkIn: today, checkOut: addDays(today, 2) })],
    });
    await signedInAs({ data });
    renderApp("/app/calendar");
    expect(await screen.findByRole("heading", { level: 1, name: "Room calendar" })).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: new RegExp(`^ROOM, ${formatDate(today, "en", { day: "numeric", month: "short" })}: 1 of 2 places taken`) }));
    const drawer = within(screen.getByRole("dialog"));
    expect(drawer.getByText("1 of 2 places used, 1 free")).toBeInTheDocument();
    expect(within(drawer.getByRole("region", { name: "Arriving" })).getByText("Mochi")).toBeInTheDocument();
    expect(drawer.getByRole("link", { name: "New booking" })).toHaveAttribute("href", `/app/bookings/new?cage=room&in=${today}&out=${addDays(today, 1)}`);
    await user.keyboard("{Escape}");
    expect(screen.getAllByRole("navigation", { name: "App" })[0]).toHaveTextContent("Rooms");
  });
});
