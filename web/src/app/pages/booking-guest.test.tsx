import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "@/shared/i18n/LocaleProvider";
import { choose } from "@/shared/testing/select";
import { dataKeyFor } from "@/app/store/storage";
import { signedInAs } from "@/app/testing/auth";
import { aCage, aPet, aSmallHotel, anOwner } from "@/app/testing/fixtures";
import type { HotelData } from "@/app/domain/types";
import AppRoutes from "./AppRoutes";

const stored = (): HotelData => JSON.parse(localStorage.getItem(dataKeyFor("acct-test")) ?? "null");

// Rina has two cats; Budi has one dog and no number.
const hotel = () =>
  aSmallHotel({
    cages: [aCage("s1"), aCage("room", "M", 60_000, 4)],
    owners: [anOwner("o1", "6281234567890"), { id: "o2", name: "Budi Santoso", whatsapp: "", language: "id" as const }],
    pets: [aPet("p1", "o1", { name: "Mochi", species: "cat", vaccineExpiry: "2099-01-01" }), aPet("p2", "o1", { name: "Kopi", species: "cat", vaccineExpiry: "2099-01-01" }), aPet("p3", "o2", { name: "Bruno", vaccineExpiry: "2099-01-01" })],
  });

async function book(data = hotel()) {
  await signedInAs({ data });
  const user = userEvent.setup();
  render(
    <LocaleProvider>
      <MemoryRouter initialEntries={["/app/bookings/new"]}>
        <Routes>
          <Route path="/app/*" element={<AppRoutes />} />
        </Routes>
      </MemoryRouter>
    </LocaleProvider>,
  );
  await screen.findByRole("heading", { name: "Owner & pets" });
  return user;
}

const save = (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole("button", { name: /save booking/i }));

describe("who a booking is for", () => {
  it("finds the owner by a pet's name or a number, then books the pets that are staying together", async () => {
    const user = await book();
    await user.type(screen.getByLabelText("Find the owner"), "kopi");
    const results = within(screen.getByRole("list", { name: "Owners on record" }));
    expect(results.getAllByRole("button")).toHaveLength(1);
    await user.click(results.getByRole("button", { name: /Owner o1/ }));
    await user.click(screen.getByLabelText(/^Mochi/));
    await user.click(screen.getByLabelText(/^Kopi/));
    await choose(user, screen.getByLabelText(/^cage ·/i), "room");
    expect(screen.getByText(/Rp\s?240\.000/)).toBeInTheDocument(); // 2 nights x 2 cats x 60.000
    await save(user);
    expect(stored().bookings[0]).toMatchObject({ petId: "p1", companionIds: ["p2"], cageId: "room" });
  });

  it("ticks the only pet of an owner by itself", async () => {
    const user = await book();
    await user.type(screen.getByLabelText("Find the owner"), "0812 3456");
    expect(within(screen.getByRole("list", { name: "Owners on record" })).getAllByRole("button")).toHaveLength(1);
    await user.clear(screen.getByLabelText("Find the owner"));
    await user.type(screen.getByLabelText("Find the owner"), "budi");
    await user.click(screen.getByRole("button", { name: /Budi Santoso/ }));
    expect(screen.getByLabelText(/^Bruno/)).toBeChecked();
  });

  it("asks for an owner and a pet before saving", async () => {
    const user = await book();
    await save(user);
    expect(screen.getByText("Choose the owner, or add a new one.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Owner o1/ }));
    await save(user);
    expect(screen.getByText("Tick at least one pet, or add one.")).toBeInTheDocument();
    expect(stored().bookings).toHaveLength(0);
  });

  it("offers the owner on record instead of a duplicate when a new owner's number is known", async () => {
    const user = await book();
    await user.type(screen.getByLabelText("Find the owner"), "Sari");
    await user.click(screen.getByRole("button", { name: /add "Sari" as a new owner/i }));
    expect(screen.getByLabelText(/owner name/i)).toHaveValue("Sari");
    await user.type(screen.getByLabelText(/owner whatsapp/i), "0812-3456-7890");
    expect(screen.getByText(/this number is already Owner o1's/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Use Owner" }));
    expect(screen.getByLabelText(/^Mochi/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/owner name/i)).not.toBeInTheDocument();
  });

  it("adds a new pet to an owner on record, sharing the stay", async () => {
    const user = await book();
    await user.click(screen.getByRole("button", { name: /Budi Santoso/ }));
    await user.click(screen.getByRole("button", { name: /add another pet of Budi's/i }));
    await user.type(screen.getByLabelText("Pet's name"), "Choco");
    await choose(user, screen.getByLabelText("Species"), "dog");
    await choose(user, screen.getByLabelText(/^cage ·/i), "s1");
    await save(user);
    const s = stored();
    const choco = s.pets.find((p) => p.name === "Choco")!;
    expect(choco).toMatchObject({ ownerId: "o2", species: "dog" });
    expect(s.owners).toHaveLength(2);
    expect(s.bookings[0]).toMatchObject({ petId: "p3", companionIds: [choco.id] });
  });
});
