import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "@/shared/i18n/LocaleProvider";
import { addDays, todayISO } from "@/app/domain/logic";
import { signedInAs } from "@/app/testing/auth";
import { aBooking, aSmallHotel } from "@/app/testing/fixtures";
import AppRoutes from "./AppRoutes";

function Where() {
  const { pathname } = useLocation();
  return <output data-testid="where">{pathname}</output>;
}

function renderApp(path: string) {
  return render(
    <LocaleProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/app/*" element={<AppRoutes />} />
        </Routes>
        <Where />
      </MemoryRouter>
    </LocaleProvider>,
  );
}

const where = () => screen.getByTestId("where").textContent;

describe("the stay going on now", () => {
  const today = todayISO();

  it("opens the stay of a pet who is here", async () => {
    await signedInAs({
      data: aSmallHotel({
        bookings: [
          aBooking("later", { petId: "p2", cageId: "s2", checkIn: addDays(today, 3), checkOut: addDays(today, 5) }),
          aBooking("here", { petId: "p1", cageId: "s1", checkIn: addDays(today, -1), checkOut: addDays(today, 2), status: "checked_in" }),
        ],
      }),
    });
    renderApp("/app/bookings/current");
    expect(await screen.findByRole("heading", { name: "Pet p1", level: 1 })).toBeInTheDocument();
    expect(where()).toBe("/app/bookings/here");
  });

  it("shows the bookings when nobody is here or arriving", async () => {
    await signedInAs({ data: aSmallHotel() });
    renderApp("/app/bookings/current");
    expect(await screen.findByRole("heading", { name: "Bookings", level: 1 })).toBeInTheDocument();
    expect(where()).toBe("/app/bookings");
  });
});
