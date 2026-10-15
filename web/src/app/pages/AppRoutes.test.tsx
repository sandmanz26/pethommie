import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "@/shared/i18n/LocaleProvider";
import { STORAGE_KEY } from "@/app/store/storage";
import { aSmallHotel } from "@/app/testing/fixtures";
import AppRoutes from "./AppRoutes";

/** The app exactly as App.tsx mounts it, starting at `path`. */
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

const stored = () => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");

describe("a new owner's first visit", () => {
  it("is sent to onboarding and can set up a hotel in a few taps", async () => {
    const user = userEvent.setup();
    renderApp("/app");

    // 0. Welcome
    expect(await screen.findByRole("heading", { name: /welcome to pethommie/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /start setup/i }));

    // 1. Hotel: the name is required
    await user.click(screen.getByRole("button", { name: /next: your cages/i }));
    expect(screen.getByText(/enter your pet hotel's name/i)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/pet hotel name/i), "Rumah Meong Bintaro");
    await user.type(screen.getByLabelText(/business whatsapp/i), "0812 3456 7890");
    await user.click(screen.getByRole("button", { name: /next: your cages/i }));

    // 2. Cages: pick the large preset
    await user.click(screen.getByRole("tab", { name: /large hotel/i }));
    expect(screen.getByText("30 cages in total")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /finish setup/i }));

    // 3. Done
    expect(await screen.findByRole("heading", { name: /rumah meong bintaro is ready/i })).toBeInTheDocument();
    expect(screen.getByText(/30 cages · from/i)).toBeInTheDocument();

    const saved = stored();
    expect(saved.hotel).toMatchObject({ name: "Rumah Meong Bintaro", whatsapp: "6281234567890" });
    expect(saved.cages).toHaveLength(30);
    expect(saved.cages.map((c: { name: string }) => c.name)).toContain("S-14");
  });

  it("can be skipped with sample data", async () => {
    const user = userEvent.setup();
    renderApp("/app/onboarding");
    await user.click(await screen.findByRole("button", { name: /explore with sample data/i }));
    expect(await screen.findByRole("heading", { name: /^today$/i })).toBeInTheDocument();
    expect(stored().bookings.length).toBeGreaterThan(0);
  });

  it("keeps the price you typed when you switch presets", async () => {
    const user = userEvent.setup();
    renderApp("/app/onboarding");
    await user.click(await screen.findByRole("button", { name: /start setup/i }));
    await user.type(screen.getByLabelText(/pet hotel name/i), "Rumah");
    await user.click(screen.getByRole("button", { name: /next: your cages/i }));
    const [small] = screen.getAllByLabelText(/price per night/i);
    await user.clear(small);
    await user.type(small, "65000");
    await user.click(screen.getByRole("tab", { name: /small hotel/i }));
    expect(screen.getAllByLabelText(/price per night/i)[0]).toHaveValue("65000");
  });
});

describe("a hotel that is already set up", () => {
  it("opens on today's board, and onboarding bounces back to it", async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(aSmallHotel()));
    renderApp("/app/onboarding");
    expect(await screen.findByRole("heading", { name: /^today$/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /welcome to pethommie/i })).not.toBeInTheDocument();
  });

  it("unknown app pages fall back to today", async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(aSmallHotel()));
    renderApp("/app/does-not-exist");
    expect(await screen.findByRole("heading", { name: /^today$/i })).toBeInTheDocument();
  });
});

describe("booking a stay", () => {
  it("adds a new pet and owner in the same step, and shows the booking", async () => {
    const user = userEvent.setup();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(aSmallHotel()));
    renderApp("/app/bookings/new");

    await user.click(await screen.findByRole("button", { name: /\+ new pet/i }));
    await user.type(screen.getByLabelText(/^name$/i), "Boba");
    await user.type(screen.getByLabelText(/owner name/i), "Dewi");
    await user.type(screen.getByLabelText(/owner whatsapp/i), "0857 1122 3344");
    await user.selectOptions(screen.getByLabelText(/^cage ·/i), "s1");
    await user.click(screen.getByRole("button", { name: /save booking/i }));

    expect(await screen.findByRole("heading", { name: /^bookings$/i })).toBeInTheDocument();
    const saved = stored();
    expect(saved.bookings).toHaveLength(1);
    expect(saved.pets.map((p: { name: string }) => p.name)).toContain("Boba");
    expect(saved.owners.map((o: { whatsapp: string }) => o.whatsapp)).toContain("6285711223344");
    expect(within(screen.getByRole("main")).getByText("Boba")).toBeInTheDocument();
  });

  it("only offers cages that are free for the chosen dates", async () => {
    const today = new Date();
    const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const out = new Date(today.getTime() + 2 * 86_400_000);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        aSmallHotel({
          bookings: [
            {
              id: "b1",
              petId: "p1",
              cageId: "s1",
              checkIn: iso(today),
              checkOut: iso(out),
              status: "booked",
              deposit: 0,
              notes: "",
              createdAt: "2026-10-01T00:00:00.000Z",
            },
          ],
        }),
      ),
    );
    renderApp("/app/bookings/new");
    const cage = await screen.findByLabelText(/^cage ·/i);
    const options = within(cage).getAllByRole("option").map((o) => (o as HTMLOptionElement).value);
    expect(options).not.toContain("s1");
    expect(options).toEqual(expect.arrayContaining(["s2", "m1"]));
  });
});
