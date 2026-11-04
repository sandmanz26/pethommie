import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/shared/i18n/LocaleProvider";
import { dataKeyFor } from "@/app/store/storage";
import { signedInAs } from "@/app/testing/auth";
import { aBooking, aSmallHotel } from "@/app/testing/fixtures";
import { upsertBooking } from "@/app/store/actions";
import type { HotelData } from "@/app/domain/types";
import { createMemoryGateway } from "@/app/sync/gateway";
import { toRows } from "@/app/sync/rows";
import { createSyncedRepository } from "@/app/sync/syncedRepository";
import AppRoutes from "./AppRoutes";

/**
 * A Google (Supabase) account's hotel, end to end through the app's routes, with the server played by the memory
 * gateway. The Supabase client is "configured" only after the modules have loaded, so sign-in itself stays local.
 */
const server = vi.hoisted(() => ({ live: false, gateway: null as unknown }));
vi.mock("@/app/supabase/client", () => ({ getSupabase: () => (server.live ? {} : null), supabaseConfigured: () => false }));
vi.mock("@/app/sync/supabaseGateway", () => ({ createSupabaseGateway: () => server.gateway }));

const HOTEL = "0d5e1f00-0000-4000-8000-000000000001";
const ACCOUNT = "acct-google";
type Gateway = ReturnType<typeof createMemoryGateway>;

function renderApp(path: string) {
  return render(
    <LocaleProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/app/*" element={<AppRoutes />} />
          <Route path="*" element={<p>outside the app</p>} />
        </Routes>
      </MemoryRouter>
    </LocaleProvider>,
  );
}

/** The person's hotel on the server, put there by another device of theirs. */
async function hotelOnServer(): Promise<Gateway> {
  const gateway = createMemoryGateway(toRows(aSmallHotel(), HOTEL).hotel);
  const other = createSyncedRepository({ key: "other-device", gateway, hotelId: HOTEL, debounceMs: null });
  other.save(upsertBooking(aSmallHotel(), aBooking("b1", { petId: "p1", cageId: "s1", checkIn: "2026-10-14", checkOut: "2026-10-16" })).state);
  await other.sync();
  return gateway;
}

/** Waits until the gateway is called at least once more, so a test can hold the first answer. */
function holdPulls(gateway: Gateway) {
  let release: () => void = () => undefined;
  const gate = new Promise<void>((r) => (release = r));
  const myHotel = gateway.myHotel;
  gateway.myHotel = async () => {
    await gate;
    return myHotel();
  };
  return release;
}

const signedInWithGoogle = (data?: HotelData) => signedInAs({ account: { id: ACCOUNT, provider: "supabase" }, data });

beforeEach(() => {
  server.live = true;
  server.gateway = null;
});

describe("a Google account's hotel on a new device", () => {
  it("shows it loading, never onboarding, until the server answers, then shows the hotel", async () => {
    const gateway = await hotelOnServer();
    const release = holdPulls(gateway);
    server.gateway = gateway;
    await signedInWithGoogle();
    renderApp("/app");

    expect(await screen.findByRole("heading", { name: /loading your hotel/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /welcome to siomofu/i })).not.toBeInTheDocument();

    release();
    expect(await screen.findAllByText("Rumah Meong")).not.toHaveLength(0);
    expect(screen.queryByRole("heading", { name: /loading your hotel/i })).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(dataKeyFor(ACCOUNT)) ?? "null")?.bookings).toHaveLength(1);
  });

  it("can't be set up a second time by going to onboarding directly while the server hasn't answered", async () => {
    const gateway = await hotelOnServer();
    const release = holdPulls(gateway);
    const create = vi.spyOn(gateway, "createHotel");
    server.gateway = gateway;
    await signedInWithGoogle();
    renderApp("/app/onboarding");

    expect(await screen.findByRole("heading", { name: /loading your hotel/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /start setup/i })).not.toBeInTheDocument();
    release();
    expect(await screen.findAllByText("Rumah Meong")).not.toHaveLength(0);
    expect(create).not.toHaveBeenCalled();
  });

  it("goes to onboarding when the server says there is no hotel yet", async () => {
    server.gateway = createMemoryGateway(toRows(aSmallHotel(), HOTEL).hotel, { exists: false });
    await signedInWithGoogle();
    renderApp("/app");
    expect(await screen.findByRole("heading", { name: /welcome to siomofu/i })).toBeInTheDocument();
  });

  it("offline on the first sign-in: says a connection is needed, and loads the hotel on retry", async () => {
    const gateway = await hotelOnServer();
    gateway.offline(true);
    server.gateway = gateway;
    await signedInWithGoogle();
    const user = userEvent.setup();
    renderApp("/app");

    expect(await screen.findByRole("heading", { name: /connect to load your hotel/i })).toBeInTheDocument();
    expect(screen.getByText(/first sign-in on a device needs an internet connection/i)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /welcome to siomofu/i })).not.toBeInTheDocument();

    gateway.offline(false);
    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(await screen.findAllByText("Rumah Meong")).not.toHaveLength(0);
  });

  it("a device that already has its copy opens straight away, server or not", async () => {
    const gateway = await hotelOnServer();
    gateway.offline(true);
    server.gateway = gateway;
    await signedInWithGoogle(aSmallHotel());
    renderApp("/app");
    expect(await screen.findAllByText("Rumah Meong")).not.toHaveLength(0);
    expect(screen.queryByRole("heading", { name: /loading your hotel|connect to load/i })).not.toBeInTheDocument();
  });
});

describe("deleting a Google account's hotel from Settings", () => {
  async function openDelete() {
    const gateway = await hotelOnServer();
    server.gateway = gateway;
    await signedInWithGoogle();
    const user = userEvent.setup();
    renderApp("/app/settings");
    await screen.findAllByText("Rumah Meong", undefined, { timeout: 3000 });
    await user.click(await screen.findByRole("button", { name: /delete all data/i }));
    const dialog = screen.getByRole("dialog", { name: /delete all data/i });
    return { gateway, user, dialog };
  }

  it("offers this device only or everywhere, and says which is which", async () => {
    const { dialog } = await openDelete();
    expect(within(dialog).getByRole("heading", { name: /remove from this device only/i })).toBeInTheDocument();
    expect(within(dialog).getByText(/stays online and on your other devices/i)).toBeInTheDocument();
    expect(within(dialog).getByRole("heading", { name: /delete everywhere/i })).toBeInTheDocument();
    expect(within(dialog).getByText(/on the server and on every device/i)).toBeInTheDocument();
  });

  it("everywhere: only once the hotel name is typed, then the server is emptied too", async () => {
    const { gateway, user, dialog } = await openDelete();
    await user.click(within(dialog).getByRole("button", { name: /delete everywhere/i }));
    expect(within(dialog).getByText(/that isn't the hotel name/i)).toBeInTheDocument();
    expect(gateway.rows().bookings).toHaveLength(1);

    await user.type(within(dialog).getByLabelText(/type the hotel name/i), "Rumah Meong");
    await user.click(within(dialog).getByRole("button", { name: /delete everywhere/i }));
    expect(await screen.findByRole("heading", { name: /welcome to siomofu/i })).toBeInTheDocument();
    await waitFor(() => expect(gateway.rows().bookings).toHaveLength(0), { timeout: 4000 });
    expect(gateway.rows().cages).toHaveLength(0);
    expect(gateway.rows().pets).toHaveLength(0);
  });

  it("this device only: signs out, clears the copy here, and leaves the server as it was", async () => {
    const { gateway, user, dialog } = await openDelete();
    const before = JSON.stringify(gateway.rows());
    await user.click(within(dialog).getByRole("button", { name: /remove from this device/i }));
    expect(await screen.findByRole("button", { name: /^log in$/i })).toBeInTheDocument();
    expect(localStorage.getItem(dataKeyFor(ACCOUNT))).toBeNull();
    expect(JSON.stringify(gateway.rows())).toBe(before);
    expect(gateway.hotel()?.name).toBe("Rumah Meong");
  });
});
