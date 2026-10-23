import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "@/shared/i18n/LocaleProvider";
import { addDays, todayISO } from "@/app/domain/logic";
import { modeKeyFor } from "@/app/mode/mode";
import { dataKeyFor } from "@/app/store/storage";
import { signedInAs } from "@/app/testing/auth";
import { aBooking, aCage, aPet, aSmallHotel, anOwner } from "@/app/testing/fixtures";
import { defaultSettings, type HotelData, type Payment } from "@/app/domain/types";
import AppRoutes from "./AppRoutes";
import { choose } from "@/shared/testing/select";
import { openNavGroups } from "@/app/testing/nav";

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
const year = today.slice(0, 4);
const pay = (amount: number): Payment => ({ id: `pay${amount}`, at: new Date().toISOString(), amount, method: "cash", kind: "payment" as const, reference: "", note: "" });
const stored = (): HotelData => JSON.parse(localStorage.getItem(dataKeyFor("acct-test")) ?? "null");

// Mochi stayed 2 nights in a Rp 50.000 cage and paid Rp 100.000; Kopi (same owner) is staying with Mochi's friend.
const hotel = (over: Partial<HotelData> = {}) =>
  aSmallHotel({
    cages: [aCage("s1"), aCage("s2")],
    owners: [anOwner("o1", "6281234567890"), anOwner("o2", "6285711223344", "en")],
    pets: [aPet("p1", "o1", { name: "Mochi" }), aPet("p2", "o1", { name: "Boba", species: "cat" }), aPet("p3", "o2", { name: "Kopi" })],
    bookings: [
      aBooking("b1", { petId: "p1", cageId: "s1", checkIn: addDays(today, -4), checkOut: addDays(today, -2), status: "checked_out", payments: [pay(100_000)] }),
      aBooking("b2", { petId: "p3", cageId: "s2", checkIn: addDays(today, -1), checkOut: addDays(today, 2), status: "checked_in" }),
    ],
    ...over,
  });

async function open(path: string, data = hotel()) {
  await signedInAs({ data });
  localStorage.setItem(modeKeyFor("acct-test"), "advanced");
  const user = userEvent.setup();
  renderApp(path);
  return user;
}

describe("add-ons and discounts", () => {
  it("adds an add-on and a discount to a stay, and the total follows", async () => {
    const user = await open("/app/bookings/b2");
    const panel = within(await screen.findByRole("region", { name: "Add-ons and discounts" }));
    expect(panel.getByText("Rp 150.000", { exact: false, selector: "b" })).toBeInTheDocument();

    await user.type(panel.getByLabelText("What for"), "Grooming");
    await user.type(panel.getByLabelText("Amount (Rp)"), "75000");
    await user.click(panel.getByRole("button", { name: "Add" }));
    expect(panel.getByText("Grooming")).toBeInTheDocument();
    expect(stored().bookings.find((b) => b.id === "b2")!.charges).toMatchObject([{ label: "Grooming", amount: 75_000 }]);

    await user.type(panel.getByLabelText("What for"), "Loyal customer");
    await user.type(panel.getByLabelText("Amount (Rp)"), "25000");
    await choose(user, panel.getByLabelText("Add-on / Discount"), "discount");
    await user.click(panel.getByRole("button", { name: "Add" }));
    expect(stored().bookings.find((b) => b.id === "b2")!.charges.map((c) => c.amount)).toEqual([75_000, -25_000]);
    // 3 nights × 50.000 + 75.000 − 25.000
    expect(panel.getByText(/Rp\s?200\.000/, { selector: "b" })).toBeInTheDocument();
  });

  it("refuses a line with no name or no amount", async () => {
    const user = await open("/app/bookings/b2");
    const panel = within(await screen.findByRole("region", { name: "Add-ons and discounts" }));
    await user.click(panel.getByRole("button", { name: "Add" }));
    expect(panel.getByText("Write what it is for.")).toBeInTheDocument();
    expect(panel.getByText("Enter an amount above zero.")).toBeInTheDocument();
    expect(stored().bookings.find((b) => b.id === "b2")!.charges).toEqual([]);
  });
});

describe("pets sharing a cage", () => {
  it("shows every pet of the stay by name", async () => {
    const data = hotel();
    data.bookings[0] = { ...data.bookings[0], companionIds: ["p2"] };
    await open("/app/bookings/b1", data);
    expect(await screen.findByRole("heading", { level: 1, name: "Mochi & Boba" })).toBeInTheDocument();
  });

  it("lets a sibling be added to a stay that is being edited, and refuses one that is already booked elsewhere", async () => {
    const data = hotel();
    data.bookings.push(aBooking("b3", { petId: "p2", cageId: "s1", checkIn: addDays(today, 5), checkOut: addDays(today, 7) }));
    data.bookings.push(aBooking("b4", { petId: "p1", cageId: "s1", checkIn: addDays(today, 5), checkOut: addDays(today, 7) }));
    const user = await open("/app/bookings/b4", data);
    await user.click(await screen.findByRole("button", { name: "Change dates or cage" }));
    await user.click(screen.getByRole("checkbox", { name: /Boba/ }));
    await user.click(screen.getByRole("button", { name: /Save changes/i }));
    expect(await screen.findByText("That pet is already booked on some of these dates.")).toBeInTheDocument();
    expect(stored().bookings.find((b) => b.id === "b4")!.companionIds).toEqual([]);
  });
});

describe("invoices", () => {
  it("makes an invoice for a stay, lists it in the register and keeps its number when voided", async () => {
    const data = hotel({ settings: { ...defaultSettings(), legalName: "CV Rumah Meong", invoicePrefix: "RM" } });
    const user = await open("/app/bookings/b1", data);
    await user.click(await screen.findByRole("button", { name: "Create invoice" }));
    expect(stored().invoices).toHaveLength(1);
    expect(stored().invoices[0]).toMatchObject({ number: `RM-${year}-0001`, total: 100_000, status: "issued" });

    // register
    openNavGroups();
    await user.click(screen.getByRole("link", { name: "Invoices" }));
    const main = within(await screen.findByRole("main"));
    expect(main.getByRole("link", { name: `RM-${year}-0001` })).toBeInTheDocument();

    // the document, then void it
    await user.click(main.getByRole("link", { name: `RM-${year}-0001` }));
    expect(await screen.findByText("CV Rumah Meong", { selector: "*" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Void invoice" }));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Void invoice" }));
    expect(stored().invoices[0].status).toBe("void");
    expect(stored().invoices[0].number).toBe(`RM-${year}-0001`);
  });

  it("shows the invoice in the owner's language, and can switch", async () => {
    const data = hotel();
    const user = await open("/app/bookings/b2", data);
    // Kopi's owner reads English: the panel starts there
    expect(await screen.findByRole("combobox", { name: "Language" })).toHaveAttribute("data-value", "en");
    await user.click(screen.getByRole("button", { name: "Create invoice" }));
    expect(stored().invoices[0].language).toBe("en");
  });

  it("says there are none when the month is empty", async () => {
    await open("/app/invoices");
    expect(await screen.findByText("No invoices this month.")).toBeInTheDocument();
  });

  it("is not offered for a cancelled stay", async () => {
    const data = hotel();
    data.bookings[1] = { ...data.bookings[1], status: "cancelled" };
    await open("/app/bookings/b2", data);
    await screen.findByRole("main");
    expect(screen.queryByRole("button", { name: "Create invoice" })).not.toBeInTheDocument();
  });
});

describe("tax page", () => {
  const taxed = () =>
    hotel({ settings: { ...defaultSettings(), tax: { ...defaultSettings().tax, regime: "final_umkm", taxpayer: "other", basis: "cash" } } });

  it("always says it is an estimate and when the rules are from", async () => {
    await open("/app/tax", taxed());
    expect(await screen.findByText("An estimate, not a filing.", { exact: false })).toBeInTheDocument();
    expect(screen.getByText(/rules as of/i)).toBeInTheDocument();
  });

  it("works out 0.5% of what was received, and says by when to pay", async () => {
    await open("/app/tax", taxed());
    const main = within(await screen.findByRole("main"));
    // Rp 100.000 received × 0.5% = Rp 500
    expect(main.getByText(/Rp\s?500$/, { selector: ".ds-stat__value" })).toBeInTheDocument();
    expect(main.getByText(/Pay by the 15th/)).toBeInTheDocument();
  });

  it("does not tax an individual's first Rp500 million", async () => {
    const data = taxed();
    data.settings.tax.taxpayer = "individual";
    await open("/app/tax", data);
    const main = within(await screen.findByRole("main"));
    expect(main.getByText("For an individual, the first Rp500 million of the year's turnover is not taxed.")).toBeInTheDocument();
    expect(main.getAllByText(/Rp\s?0$/, { selector: ".ds-stat__value" }).length).toBeGreaterThan(0);
  });

  it("points to Settings when tax is not set up, and hides the PPh columns", async () => {
    await open("/app/tax", hotel());
    const main = within(await screen.findByRole("main"));
    expect(main.getByRole("link", { name: "Set up tax in Settings" })).toBeInTheDocument();
    expect(main.queryByRole("columnheader", { name: "PPh final" })).not.toBeInTheDocument();
    expect(main.getByText(/not set up as a VAT payer/)).toBeInTheDocument();
  });

  it("warns when turnover nears the ceiling", async () => {
    const data = taxed();
    data.bookings[0] = { ...data.bookings[0], payments: [pay(4_000_000_000)] };
    await open("/app/tax", data);
    expect(await screen.findByText(/near Rp4\.8 billion/)).toBeInTheDocument();
  });
});

describe("business and tax settings", () => {
  it("saves the invoice prefix and tax profile", async () => {
    const user = await open("/app/settings");
    await screen.findByRole("heading", { name: "Business and invoices" });
    await user.clear(screen.getByLabelText(/Invoice number prefix/));
    await user.type(screen.getByLabelText(/Invoice number prefix/), "kk-1");
    await choose(user, screen.getByLabelText("How the business is taxed"), "final_umkm");
    await choose(user, screen.getByLabelText("Count turnover"), "accrual");
    await user.click(screen.getAllByRole("button", { name: "Save" })[1]);
    const { settings } = stored();
    expect(settings.invoicePrefix).toBe("KK1");
    expect(settings.tax).toMatchObject({ regime: "final_umkm", basis: "accrual" });
  });

  it("refuses a prefix with nothing usable in it", async () => {
    const user = await open("/app/settings");
    await screen.findByRole("heading", { name: "Business and invoices" });
    await user.clear(screen.getByLabelText(/Invoice number prefix/));
    await user.type(screen.getByLabelText(/Invoice number prefix/), "--");
    await user.click(screen.getAllByRole("button", { name: "Save" })[1]);
    expect(await screen.findByText("Use at least one letter or digit.")).toBeInTheDocument();
    expect(stored().settings?.invoicePrefix ?? "INV").toBe("INV");
  });

  it("asks for a VAT rate only once the hotel is a VAT payer", async () => {
    const user = await open("/app/settings");
    await screen.findByRole("heading", { name: "Business and invoices" });
    expect(screen.queryByLabelText(/VAT rate/)).not.toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: /Registered for VAT/ }));
    expect(screen.getByLabelText(/VAT rate/)).toBeInTheDocument();
  });
});

describe("owner language", () => {
  it("writes the daily report in English for an owner who reads English", async () => {
    const data = hotel();
    data.careLog = [{ id: "c1", bookingId: "b2", at: new Date().toISOString(), kind: "meal", preset: "all", note: "" }];
    await open("/app/bookings/b2", data);
    // The wording itself is checked in domain/messages tests; here it is the note that says which language is used.
    expect((await screen.findAllByText(/written in English/)).length).toBeGreaterThan(0);
    expect(screen.queryByText(/written in Indonesian/)).not.toBeInTheDocument();
  });

  it("lets the operator change an owner's language", async () => {
    const user = await open("/app/customers/o1");
    await choose(user, await screen.findByLabelText("Language of messages and invoices"), "en");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(stored().owners.find((o) => o.id === "o1")!.language).toBe("en");
  });
});
