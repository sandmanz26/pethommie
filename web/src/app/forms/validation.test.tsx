import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/shared/i18n/LocaleProvider";
import { choose } from "@/shared/testing/select";
import { addDays, todayISO } from "@/app/domain/logic";
import type { HotelData } from "@/app/domain/types";
import { modeKeyFor } from "@/app/mode/mode";
import { dataKeyFor } from "@/app/store/storage";
import { signedInAs } from "@/app/testing/auth";
import { aBooking, aCage, aSmallHotel } from "@/app/testing/fixtures";
import { CageForm } from "@/app/design-system/organisms/CageForm";
import { PetForm } from "@/app/design-system/organisms/PetForm";
import { ChargesPanel } from "@/app/design-system/organisms/ChargesPanel";
import { PaymentsPanel } from "@/app/design-system/organisms/PaymentsPanel";
import { CheckInForm } from "@/app/design-system/organisms/CheckInForm";
import { BookingEditForm } from "@/app/design-system/organisms/BookingEditForm";
import { CareLogPanel } from "@/app/design-system/organisms/CareLogPanel";
import { BookingForm } from "@/app/design-system/organisms/BookingForm";
import AppRoutes from "@/app/pages/AppRoutes";

const today = todayISO();
const long = (n: number) => "x".repeat(n);

function show(ui: ReactNode) {
  const user = userEvent.setup();
  render(
    <LocaleProvider>
      <MemoryRouter>{ui}</MemoryRouter>
    </LocaleProvider>,
  );
  return user;
}

const alerts = () => screen.queryAllByRole("alert").map((a) => a.textContent);

describe("cage form", () => {
  it("catches a price with an extra zero, a bad capacity and a long name, focusing the first", async () => {
    const onSubmit = vi.fn();
    const user = show(<CageForm onSubmit={onSubmit} onCancel={() => {}} />);
    await user.type(screen.getByLabelText("Name"), long(31));
    await choose(user, screen.getByLabelText("Type"), "shared");
    await user.clear(screen.getByLabelText(/places/i));
    await user.type(screen.getByLabelText(/places/i), "500");
    await user.clear(screen.getByLabelText(/price per pet/i));
    await user.type(screen.getByLabelText(/price per pet/i), "1000000000");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(alerts()).toEqual(["Keep it to 30 characters or fewer.", "Enter a whole number from 2 to 50.", expect.stringMatching(/^That's more than Rp\s?100\.000\.000\. Check for an extra zero\.$/)]);
    expect(screen.getByLabelText("Name")).toHaveFocus();
    expect(onSubmit).not.toHaveBeenCalled();

    // Fixing a field clears its error.
    await user.clear(screen.getByLabelText("Name"));
    expect(alerts()).toHaveLength(2);
    await user.type(screen.getByLabelText("Name"), "R-01");
    await user.clear(screen.getByLabelText(/places/i));
    await user.type(screen.getByLabelText(/places/i), "6");
    await user.clear(screen.getByLabelText(/price per pet/i));
    await user.type(screen.getByLabelText(/price per pet/i), "55.000");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit).toHaveBeenCalledWith({ name: "R-01", size: "M", pricePerNight: 55_000, capacity: 6, archived: false });
  });

  it("keeps its own words for a missing price and too few places", async () => {
    const onSubmit = vi.fn();
    const user = show(<CageForm onSubmit={onSubmit} onCancel={() => {}} />);
    await user.type(screen.getByLabelText("Name"), "R");
    await choose(user, screen.getByLabelText("Type"), "shared");
    await user.clear(screen.getByLabelText(/places/i));
    await user.type(screen.getByLabelText(/places/i), "1");
    await user.clear(screen.getByLabelText(/price per pet/i));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(alerts()).toEqual(["A shared room needs at least 2 places.", "Enter a price above 0."]);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe("pet form", () => {
  it("checks the owner's name length, the notes length and the vaccine date", async () => {
    const onSubmit = vi.fn();
    const user = show(<PetForm submitLabel="Save pet" onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText("Name"), "Mochi");
    await user.click(screen.getByLabelText(/^care notes/i));
    await user.paste(long(501));
    await user.type(screen.getByLabelText("Owner name"), "A");
    await user.click(screen.getByRole("button", { name: "Save pet" }));
    expect(alerts()).toEqual(["Keep it to 500 characters or fewer.", "Use at least 2 characters."]);
    expect(screen.getByLabelText(/^care notes/i)).toHaveFocus();
    expect(onSubmit).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText(/^care notes/i));
    await user.type(screen.getByLabelText("Owner name"), "ndi");
    await user.click(screen.getByRole("button", { name: "Save pet" }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: "Mochi", notes: "" }), { name: "Andi", whatsapp: "" });
  });
});

describe("money panels", () => {
  const cage = aCage("c1", "S", 100_000);
  const booking = aBooking("b1", { petId: "p1", cageId: "c1", checkIn: today, checkOut: addDays(today, 2), status: "checked_in" });

  it("an add-on with letters in its amount is not added", async () => {
    const onAdd = vi.fn(() => []);
    const user = show(<ChargesPanel booking={booking} cage={cage} onAdd={onAdd} />);
    const form = within(screen.getByRole("form", { name: /add-ons/i }));
    await user.type(form.getByLabelText("What for"), "Grooming");
    await user.type(form.getByLabelText("Amount (Rp)"), "50rb");
    await user.click(form.getByRole("button", { name: "Add" }));
    expect(form.getByRole("alert")).toHaveTextContent("Use whole rupiah, digits only");
    expect(form.getByLabelText("Amount (Rp)")).toHaveFocus();
    expect(onAdd).not.toHaveBeenCalled();

    await user.clear(form.getByLabelText("Amount (Rp)"));
    await user.type(form.getByLabelText("Amount (Rp)"), "50.000");
    await user.click(form.getByRole("button", { name: "Add" }));
    expect(onAdd).toHaveBeenCalledWith({ label: "Grooming", amount: 50_000 });
  });

  it("a payment above the limit is not recorded, a normal one is", async () => {
    const onAdd = vi.fn(() => []);
    const user = show(<PaymentsPanel booking={booking} cage={cage} onAdd={onAdd} />);
    const form = within(screen.getByRole("form", { name: "Record a payment" }));
    await user.type(form.getByLabelText("Amount (Rp)"), "2000000000");
    await user.type(form.getByLabelText(/^reference/i), long(81));
    await user.click(form.getByRole("button", { name: "Save payment" }));
    expect(form.getAllByRole("alert").map((a) => a.textContent)).toEqual([expect.stringMatching(/more than Rp\s?100\.000\.000/), "Keep it to 80 characters or fewer."]);
    expect(onAdd).not.toHaveBeenCalled();

    await user.clear(form.getByLabelText("Amount (Rp)"));
    await user.type(form.getByLabelText("Amount (Rp)"), "200000");
    await user.clear(form.getByLabelText(/^reference/i));
    await user.click(form.getByRole("button", { name: "Save payment" }));
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ amount: 200_000 }));
  });

  it("still shows the overpayment rule from the store", async () => {
    const onAdd = vi.fn(() => ["refund" as const]);
    const user = show(<PaymentsPanel booking={booking} cage={cage} onAdd={onAdd} />);
    const form = within(screen.getByRole("form", { name: "Record a payment" }));
    await user.type(form.getByLabelText("Amount (Rp)"), "5000");
    await user.click(form.getByRole("button", { name: "Save payment" }));
    expect(onAdd).toHaveBeenCalled();
    expect(form.getByRole("alert")).toBeInTheDocument();
  });
});

describe("stay forms", () => {
  it("check-in refuses an essay in the food field", async () => {
    const onSubmit = vi.fn();
    const user = show(<CheckInForm onSubmit={onSubmit} />);
    await user.click(screen.getByLabelText(/^food from the owner/i));
    await user.paste(long(201));
    await user.click(screen.getByRole("button", { name: "Check in" }));
    expect(alerts()).toEqual(["Keep it to 200 characters or fewer."]);
    expect(onSubmit).not.toHaveBeenCalled();
    await user.clear(screen.getByLabelText(/^food from the owner/i));
    await user.type(screen.getByLabelText(/^food from the owner/i), "Royal Canin");
    await user.click(screen.getByRole("button", { name: "Check in" }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ food: "Royal Canin" }));
  });

  it("editing a booking checks the notes before saving", async () => {
    const data = aSmallHotel();
    const pet = data.pets[0];
    const booking = aBooking("b1", { petId: pet.id, cageId: data.cages[0].id, checkIn: addDays(today, 1), checkOut: addDays(today, 3) });
    const onSave = vi.fn(() => []);
    const user = show(<BookingEditForm data={{ ...data, bookings: [booking] }} booking={booking} onSave={onSave} onCancel={() => {}} />);
    await user.click(screen.getByLabelText(/^notes/i));
    await user.paste(long(501));
    await user.click(screen.getByRole("button", { name: /save/i }));
    expect(alerts()).toEqual(["Keep it to 500 characters or fewer."]);
    expect(onSave).not.toHaveBeenCalled();
    await user.clear(screen.getByLabelText(/^notes/i));
    await user.click(screen.getByRole("button", { name: /save/i }));
    expect(onSave).toHaveBeenCalled();
  });

  it("the care log refuses a long note", async () => {
    const onAdd = vi.fn(() => []);
    const user = show(<CareLogPanel today={today} entries={[]} earlier={[]} checkIn={today} active onAdd={onAdd} onRemove={() => {}} />);
    await user.click(screen.getByLabelText(/^details/i));
    await user.paste(long(201));
    await user.click(screen.getByRole("button", { name: "All eaten" }));
    expect(alerts()).toEqual(["Keep it to 200 characters or fewer."]);
    expect(onAdd).not.toHaveBeenCalled();
  });
});

describe("booking form", () => {
  it("a deposit bigger than the stay is refused; one within it is saved", async () => {
    const data = aSmallHotel();
    const pet = data.pets[0];
    const onSubmit = vi.fn();
    const user = show(<BookingForm data={data} initialPetId={pet.id} initialCageId={data.cages[0].id} onSubmit={onSubmit} onCancel={() => {}} />);
    await user.type(screen.getByLabelText(/^deposit paid/i), "99.000.000");
    await user.click(screen.getByRole("button", { name: "Save booking" }));
    expect(screen.getByText(/A deposit can't be more than the stay costs/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^deposit paid/i)).toHaveFocus();
    expect(onSubmit).not.toHaveBeenCalled();
    await user.clear(screen.getByLabelText(/^deposit paid/i));
    await user.type(screen.getByLabelText(/^deposit paid/i), "50.000");
    await user.click(screen.getByRole("button", { name: "Save booking" }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ payments: [expect.objectContaining({ amount: 50_000, kind: "deposit" })] }), expect.anything());
  });
});

describe("pages", () => {
  const stored = (): HotelData => JSON.parse(localStorage.getItem(dataKeyFor("acct-test")) ?? "null");
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

  it("an expense with a typo'd amount is not saved", async () => {
    const user = await open("/app/expenses", aSmallHotel());
    const form = within(await screen.findByRole("form", { name: /record an expense/i }));
    await user.type(form.getByLabelText(/amount/i), "3500000000");
    await user.click(form.getByRole("button", { name: /save expense/i }));
    expect(form.getByRole("alert")).toHaveTextContent(/more than Rp\s?100\.000\.000/);
    expect(stored().expenses).toEqual([]);
    await user.clear(form.getByLabelText(/amount/i));
    await user.type(form.getByLabelText(/amount/i), "350000");
    await user.click(form.getByRole("button", { name: /save expense/i }));
    expect(stored().expenses).toEqual([expect.objectContaining({ amount: 350_000 })]);
  });

  it("settings refuse a short NPWP and a one-letter hotel name", async () => {
    const user = await open("/app/settings", aSmallHotel());
    const npwp = await screen.findByLabelText(/^npwp/i);
    await user.type(npwp, "12345");
    await user.click(within(document.getElementById("business")!).getByRole("button", { name: "Save" }));
    expect(await screen.findByText("An NPWP has 15 or 16 digits.")).toBeInTheDocument();
    expect(npwp).toHaveFocus();
    expect(stored().settings.npwp).toBe("");

    const name = screen.getByLabelText("Pet hotel name");
    await user.clear(name);
    await user.type(name, "R");
    await user.click(screen.getAllByRole("button", { name: "Save" })[0]);
    expect(screen.getByText("Use at least 2 characters.")).toBeInTheDocument();
    expect(stored().hotel?.name).toBe("Rumah Meong");
  });

  it("an owner's name needs two letters", async () => {
    const data = aSmallHotel();
    const owner = data.owners[0];
    const user = await open(`/app/customers/${owner.id}`, data);
    const form = within(await screen.findByRole("form", { name: "Owner details" }));
    await user.clear(form.getByLabelText("Name"));
    await user.type(form.getByLabelText("Name"), "B");
    await user.click(form.getByRole("button", { name: "Save" }));
    expect(form.getByRole("alert")).toHaveTextContent("Use at least 2 characters.");
    expect(stored().owners[0].name).toBe(owner.name);
  });
});
