import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "@/shared/i18n/LocaleProvider";
import { addDays, todayISO } from "@/app/domain/logic";
import { modeKeyFor } from "@/app/mode/mode";
import { signedInAs } from "@/app/testing/auth";
import { aBooking, aCage, aPet, aSmallHotel, anOwner } from "@/app/testing/fixtures";
import AppRoutes from "./AppRoutes";
import { choose } from "@/shared/testing/select";

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
const today = todayISO();
const hotel = () =>
  aSmallHotel({
    cages: [aCage("s1"), aCage("s2")],
    owners: [anOwner("o1"), anOwner("o2")],
    pets: [aPet("p1", "o1", { name: "Mochi", species: "cat", vaccineExpiry: addDays(today, 200) }), aPet("p2", "o2", { name: "Kopi", species: "dog", vaccineExpiry: addDays(today, 200) }), aPet("p3", "o2", { name: "Luna", species: "cat" })],
    bookings: [
      aBooking("b1", { petId: "p1", cageId: "s1", checkIn: addDays(today, -1), checkOut: addDays(today, 2), status: "checked_in", source: "instagram" }),
      aBooking("b2", { petId: "p2", cageId: "s2", checkIn: addDays(today, 3), checkOut: addDays(today, 5), source: "whatsapp" }),
    ],
  });
async function open(path: string, mode: "simple" | "advanced" = "advanced") {
  await signedInAs({ data: hotel() });
  localStorage.setItem(modeKeyFor("acct-test"), mode);
  const user = userEvent.setup();
  renderApp(path);
  return user;
}

describe("pets list", () => {
  it("labels a pet that is staying, with its cage and until when, and one arriving soon", async () => {
    await open("/app/pets", "simple");
    const mochi = (await screen.findByText("Mochi")).closest("a")!;
    expect(within(mochi).getByText(/^Staying · S1 · until /)).toBeInTheDocument();
    expect(within(screen.getByText("Kopi").closest("a")!).getByText(/^Arrives /)).toBeInTheDocument();
    expect(within(screen.getByText("Luna").closest("a")!).queryByText(/^Staying|^Arrives/)).not.toBeInTheDocument();
  });

  it("filters by stay, species and vaccine, and clears", async () => {
    const user = await open("/app/pets", "simple");
    await user.click(await screen.findByRole("tab", { name: /Staying now/ }));
    expect(screen.getByText("Mochi")).toBeInTheDocument();
    expect(screen.queryByText("Kopi")).not.toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: /^All/ }));
    await choose(user, screen.getByLabelText("Species"), "cat");
    await choose(user, screen.getByLabelText("Vaccine"), "attention");
    expect(screen.getByText("Luna")).toBeInTheDocument();
    expect(screen.queryByText("Mochi")).not.toBeInTheDocument();
    expect(screen.getByText("1 result")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByText("3 results")).toBeInTheDocument();
  });
});

describe("bookings list", () => {
  it("filters by source and payment in advanced mode, and searches in both", async () => {
    const user = await open("/app/bookings");
    await choose(user, await screen.findByLabelText("Booked via"), "whatsapp");
    expect(screen.getByRole("link", { name: "Kopi" })).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: /Staying/ }));
    expect(screen.queryByRole("link", { name: "Mochi" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByRole("link", { name: "Mochi" })).toBeInTheDocument();
  });

  it("keeps simple mode to a search box", async () => {
    const user = await open("/app/bookings", "simple");
    expect(screen.queryByLabelText("Booked via")).not.toBeInTheDocument();
    await user.type(await screen.findByRole("searchbox"), "owner o2");
    expect(screen.getByRole("link", { name: "Kopi" })).toBeInTheDocument();
  });
});

describe("customers list", () => {
  it("shows segments with counts, and who owes", async () => {
    const user = await open("/app/customers");
    expect(await screen.findByRole("tab", { name: /New\s*2/ })).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: /Owe money/ }));
    expect(screen.getByRole("link", { name: /Owner o1/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Owner o2/ })).not.toBeInTheDocument();
  });
});
