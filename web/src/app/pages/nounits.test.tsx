import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "@/shared/i18n/LocaleProvider";
import { addDays, todayISO } from "@/app/domain/logic";
import { defaultSettings, defaultStayRules, emptyData, type HotelData } from "@/app/domain/types";
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

/** A hotel with no cages or rooms: room for `capacity` pets, 60.000 per pet per night. Three owners with a pet each. */
const poolHotel = (capacity = 3, bookings: HotelData["bookings"] = []) =>
  aSmallHotel({
    settings: { ...defaultSettings(), unitTerm: "none", stayRules: defaultStayRules(true) },
    cages: [{ ...aCage("pool", "M", 60_000, capacity), name: "Shared area" }],
    owners: [anOwner("o1"), anOwner("o2"), anOwner("o3")],
    pets: [aPet("p1", "o1", { name: "Mochi", vaccineExpiry: "2099-01-01" }), aPet("p2", "o2", { name: "Kopi", vaccineExpiry: "2099-01-01" }), aPet("p3", "o3", { name: "Nala", vaccineExpiry: "2099-01-01" })],
    bookings,
  });
const stay = (id: string, petId: string, checkIn = today, checkOut = addDays(today, 2)) => aBooking(id, { petId, cageId: "pool", checkIn, checkOut });

describe("a hotel with no cages or rooms", () => {
  it("is set up with just how many pets at once and a price per pet", async () => {
    await signedInAs({ data: emptyData() });
    const user = userEvent.setup();
    renderApp("/app/onboarding");
    await user.click(await screen.findByRole("button", { name: /start setup/i }));
    await user.click(screen.getByRole("button", { name: /next/i }));
    await user.click(screen.getByRole("tab", { name: /No cages or rooms/ }));
    const capacity = screen.getByLabelText("Pets at once");
    await user.clear(capacity);
    await user.type(capacity, "1");
    await user.click(screen.getByRole("button", { name: /finish setup/i }));
    expect(screen.getByText("Between 2 and 500 places.")).toBeInTheDocument();
    expect(stored()?.hotel ?? null).toBeNull();
    await user.type(capacity, "5");
    await user.click(screen.getByRole("button", { name: /finish setup/i }));
    const data = stored();
    expect(data.settings.unitTerm).toBe("none");
    expect(data.cages).toHaveLength(1);
    expect(data.cages[0]).toMatchObject({ capacity: 15, pricePerNight: 60_000, archived: false });
    expect(await screen.findByText(/Room for 15 pets at once/)).toBeInTheDocument();
  });

  it("books without a unit picker, into the hidden unit, showing the places left", async () => {
    await signedInAs({ data: poolHotel(3, [stay("b1", "p1")]) });
    const user = userEvent.setup();
    renderApp(`/app/bookings/new?pet=p2&in=${today}&out=${addDays(today, 2)}`);
    expect(await screen.findByText("2 of 3 places free")).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: /^(cage|place)/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Rp\s?120\.000/)).toBeInTheDocument(); // 2 nights x 60.000
    await user.click(screen.getByRole("button", { name: /save booking/i }));
    const b = stored().bookings.find((x) => x.petId === "p2");
    expect(b).toMatchObject({ cageId: "pool", rate: 60_000 });
  });

  it("refuses a booking when every place is taken on one of the nights", async () => {
    // Full tomorrow only: 2 of 2 places.
    await signedInAs({ data: poolHotel(2, [stay("b1", "p1"), stay("b2", "p2", addDays(today, 1), addDays(today, 3))]) });
    const user = userEvent.setup();
    renderApp(`/app/bookings/new?pet=p3&in=${today}&out=${addDays(today, 2)}`);
    expect(await screen.findByText("0 of 2 places free")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /save booking/i }));
    expect(screen.getAllByText(/Full on at least one of these nights/).length).toBeGreaterThan(0);
    expect(stored().bookings.some((x) => x.petId === "p3")).toBe(false);
  });

  it("shows the calendar as places taken per day, with who is staying, and books from a day", async () => {
    await signedInAs({ data: poolHotel(3, [stay("b1", "p1"), stay("b2", "p2", today, addDays(today, 1))]) });
    renderApp("/app/calendar");
    expect(await screen.findByRole("heading", { level: 1, name: "Calendar" })).toBeInTheDocument();
    const days = within(screen.getByRole("list", { name: "Calendar" }));
    const first = days.getAllByRole("listitem", { name: /places taken/ })[0];
    expect(first).toHaveAccessibleName(/2 of 3 places taken/);
    expect(first).toHaveTextContent("2/3");
    expect(within(first).getByRole("link", { name: "Mochi" })).toHaveAttribute("href", "/app/bookings/b1");
    expect(within(first).getByRole("link", { name: "Kopi" })).toBeInTheDocument();
    expect(within(first).getByRole("link", { name: /New booking from/ })).toHaveAttribute("href", `/app/bookings/new?in=${today}&out=${addDays(today, 1)}`);
    expect(days.getAllByRole("listitem", { name: /places taken/ })[1]).toHaveTextContent("1/3");
  });

  it("shows free places, and no unit names, on the today board and the booking", async () => {
    await signedInAs({ data: poolHotel(3, [stay("b1", "p1", addDays(today, -1), today), { ...stay("b2", "p2"), status: "booked" }]) });
    renderApp("/app");
    expect(await screen.findByText("Free places tonight")).toBeInTheDocument();
    expect(screen.getByText("2/3")).toBeInTheDocument();
    expect(screen.queryByText("Shared area")).not.toBeInTheDocument();
    expect(screen.getAllByRole("navigation", { name: "App" })[0]).toHaveTextContent("Capacity & prices");
  });

  it("keeps the capacity editable in place of the units page, and never below what is booked", async () => {
    await signedInAs({ data: poolHotel(3, [stay("b1", "p1"), stay("b2", "p2")]) });
    const user = userEvent.setup();
    renderApp("/app/cages");
    const capacity = await screen.findByLabelText("Pets at once");
    await user.clear(capacity);
    await user.type(capacity, "1");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Between 2 and 500 pets.")).toBeInTheDocument();
    await user.clear(capacity);
    await user.type(capacity, "20");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(stored().cages[0].capacity).toBe(20);
  });
});
