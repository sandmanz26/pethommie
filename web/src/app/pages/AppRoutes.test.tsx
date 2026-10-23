import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "@/shared/i18n/LocaleProvider";
import { dataKeyFor } from "@/app/store/storage";
import { signedInAs } from "@/app/testing/auth";
import { aSmallHotel } from "@/app/testing/fixtures";
import AppRoutes from "./AppRoutes";
import { choose, openOptions } from "@/shared/testing/select";

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

const stored = (accountId = "acct-test") => JSON.parse(localStorage.getItem(dataKeyFor(accountId)) ?? "null");

describe("a signed-in owner's first visit", () => {
  it("goes to onboarding, with the hotel name and WhatsApp already filled in from sign-up", async () => {
    await signedInAs({ account: { hotelName: "Rumah Meong Bintaro", whatsapp: "6281234567890" } });
    const user = userEvent.setup();
    renderApp("/app");

    // 0. Welcome
    expect(await screen.findByRole("heading", { name: /welcome to pethommie/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /start setup/i }));

    // 1. Hotel: prefilled, so just carry on
    expect(screen.getByLabelText(/pet hotel name/i)).toHaveValue("Rumah Meong Bintaro");
    expect(screen.getByLabelText(/business whatsapp/i)).toHaveValue("0812 3456 7890");
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

  it("asks for the hotel name if it was cleared", async () => {
    await signedInAs();
    const user = userEvent.setup();
    renderApp("/app/onboarding");
    await user.click(await screen.findByRole("button", { name: /start setup/i }));
    await user.clear(screen.getByLabelText(/pet hotel name/i));
    await user.click(screen.getByRole("button", { name: /next: your cages/i }));
    expect(screen.getByText(/enter your pet hotel's name/i)).toBeInTheDocument();
  });

  it("checks every field of the hotel step, puts the cursor on the first problem, and clears it once fixed", async () => {
    await signedInAs();
    const user = userEvent.setup();
    renderApp("/app/onboarding");
    await user.click(await screen.findByRole("button", { name: /start setup/i }));
    const name = screen.getByLabelText(/pet hotel name/i);
    await user.clear(name);
    await user.type(name, "A");
    await user.type(screen.getByLabelText(/^city/i), "x".repeat(61));
    await user.clear(screen.getByLabelText(/business whatsapp/i));
    await user.type(screen.getByLabelText(/business whatsapp/i), "12");
    await user.click(screen.getByRole("button", { name: /next: your cages/i }));
    expect(screen.getByText(/use at least 2 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/keep it under 60 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/whatsapp number doesn't look right/i)).toBeInTheDocument();
    expect(name).toHaveFocus();
    await user.type(name, "nabul");
    expect(screen.queryByText(/use at least 2 characters/i)).toBeNull();
    expect(screen.getByRole("heading", { name: /what's your pet hotel called/i })).toBeInTheDocument();
  });

  it("refuses a cage price that is surely a typo, and saves nothing until it is fixed", async () => {
    await signedInAs();
    const user = userEvent.setup();
    renderApp("/app/onboarding");
    await user.click(await screen.findByRole("button", { name: /start setup/i }));
    await user.click(screen.getByRole("button", { name: /next: your cages/i }));
    const [small] = screen.getAllByLabelText(/price per night/i);
    await user.clear(small);
    await user.type(small, "50");
    await user.click(screen.getByRole("button", { name: /finish setup/i }));
    expect(screen.getByText(/at least rp\s?1\.000 a night/i)).toBeInTheDocument();
    expect(screen.getByText(/fix the fields marked in red/i)).toBeInTheDocument();
    expect(stored().hotel).toBeNull();
    await user.type(small, "000");
    await user.click(screen.getByRole("button", { name: /finish setup/i }));
    expect(await screen.findByRole("link", { name: /add your first booking/i })).toBeInTheDocument();
    expect(stored().cages.find((c: { size: string }) => c.size === "S")?.pricePerNight).toBe(50_000);
  });

  it("refuses two shared rooms with the same name, or a room without a name", async () => {
    await signedInAs();
    const user = userEvent.setup();
    renderApp("/app/onboarding");
    await user.click(await screen.findByRole("button", { name: /start setup/i }));
    await user.click(screen.getByRole("button", { name: /next: your cages/i }));
    await user.click(screen.getByRole("tab", { name: "Shared rooms, no cages" }));
    const [first, second] = screen.getAllByLabelText(/^name$/i);
    await user.clear(second);
    await user.type(second, first.getAttribute("value")!.toUpperCase());
    await user.click(screen.getByRole("button", { name: /finish setup/i }));
    expect(screen.getByText(/another room already has this name/i)).toBeInTheDocument();
    await user.clear(second);
    expect(screen.getByText(/give this room a name/i)).toBeInTheDocument();
    expect(stored().cages).toEqual([]);
  });

  it("can be skipped with sample data", async () => {
    await signedInAs();
    const user = userEvent.setup();
    renderApp("/app/onboarding");
    await user.click(await screen.findByRole("button", { name: /explore with sample data/i }));
    expect(await screen.findByRole("heading", { name: /^today$/i })).toBeInTheDocument();
    expect(stored().bookings.length).toBeGreaterThan(0);
  });

  it("keeps the price you typed when you switch presets", async () => {
    await signedInAs();
    const user = userEvent.setup();
    renderApp("/app/onboarding");
    await user.click(await screen.findByRole("button", { name: /start setup/i }));
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
    await signedInAs({ data: aSmallHotel() });
    renderApp("/app/onboarding");
    expect(await screen.findByRole("heading", { name: /^today$/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /welcome to pethommie/i })).not.toBeInTheDocument();
  });

  it("unknown app pages fall back to today", async () => {
    await signedInAs({ data: aSmallHotel() });
    renderApp("/app/does-not-exist");
    expect(await screen.findByRole("heading", { name: /^today$/i })).toBeInTheDocument();
  });
});

describe("booking a stay", () => {
  it("adds a new owner and their pet in the same step, and shows the booking", async () => {
    const user = userEvent.setup();
    await signedInAs({ data: aSmallHotel() });
    renderApp("/app/bookings/new");

    await user.click(await screen.findByRole("button", { name: /^new owner$/i }));
    await user.type(screen.getByLabelText(/owner name/i), "Dewi");
    await user.type(screen.getByLabelText(/owner whatsapp/i), "0857 1122 3344");
    await user.type(screen.getByLabelText(/pet's name/i), "Boba");
    await choose(user, screen.getByLabelText(/^cage ·/i), "s1");
    await user.click(screen.getByRole("button", { name: /save booking/i }));

    expect(await screen.findByRole("heading", { name: /^bookings$/i })).toBeInTheDocument();
    const saved = stored();
    expect(saved.bookings).toHaveLength(1);
    const boba = saved.pets.find((p: { name: string }) => p.name === "Boba");
    const dewi = saved.owners.find((o: { name: string }) => o.name === "Dewi");
    expect(dewi.whatsapp).toBe("6285711223344");
    expect(boba.ownerId).toBe(dewi.id);
    expect(saved.bookings[0].petId).toBe(boba.id);
    expect(within(screen.getByRole("main")).getByText("Boba")).toBeInTheDocument();
  });

  it("only offers cages that are free for the chosen dates", async () => {
    const today = new Date();
    const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const out = new Date(today.getTime() + 2 * 86_400_000);
    await signedInAs({
      data: aSmallHotel({
        bookings: [
          { id: "b1", petId: "p1", cageId: "s1", checkIn: iso(today), checkOut: iso(out), rate: 50_000, status: "booked", cancelReason: null, source: "other", payments: [], charges: [], companionIds: [], arrival: null, notes: "", createdAt: "2026-10-01T00:00:00.000Z" },
        ],
      }),
    });
    renderApp("/app/bookings/new");
    const cage = await screen.findByLabelText(/^cage ·/i);
    const options = (await openOptions(userEvent.setup(), cage)).map((o) => o.dataset.value);
    expect(options).not.toContain("s1");
    expect(options).toEqual(expect.arrayContaining(["s2", "m1"]));
  });
});
