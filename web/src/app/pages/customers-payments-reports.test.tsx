import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "@/shared/i18n/LocaleProvider";
import { addDays, todayISO } from "@/app/domain/logic";
import { modeKeyFor } from "@/app/mode/mode";
import { parseStored, dataKeyFor } from "@/app/store/storage";
import { signedInAs } from "@/app/testing/auth";
import { aBooking, aCage, aPet, aSmallHotel, anOwner } from "@/app/testing/fixtures";
import type { HotelData, Payment } from "@/app/domain/types";
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

const today = todayISO();
const pay = (amount: number): Payment => ({ id: String(amount), at: new Date().toISOString(), amount, method: "cash", kind: "payment" as const, reference: "", note: "" });
const stored = (): HotelData => JSON.parse(localStorage.getItem(dataKeyFor("acct-test")) ?? "null");
const rp = (n: string) => new RegExp(`Rp\\s?${n.replace(/\./g, "\\.")}`);

// Mochi (o1) left owing Rp 50.000, Kopi (o2) is staying and has paid half of Rp 150.000
const hotel = () =>
  aSmallHotel({
    cages: [aCage("s1"), aCage("s2")],
    owners: [anOwner("o1", "6281234567890"), anOwner("o2", "6285711223344")],
    pets: [aPet("p1", "o1", { name: "Mochi" }), aPet("p2", "o2", { name: "Kopi", species: "cat" })],
    bookings: [
      aBooking("b1", { petId: "p1", cageId: "s1", checkIn: addDays(today, -5), checkOut: addDays(today, -3), status: "checked_out", payments: [pay(50_000)] }),
      aBooking("b2", { petId: "p2", cageId: "s2", checkIn: addDays(today, -1), checkOut: addDays(today, 2), status: "checked_in", payments: [pay(75_000)] }),
    ],
  });

async function open(path: string, data = hotel()) {
  await signedInAs({ data });
  localStorage.setItem(modeKeyFor("acct-test"), "advanced");
  const user = userEvent.setup();
  renderApp(path);
  return user;
}

describe("customers", () => {
  it("lists owners with their pets and what they owe, and finds by pet name", async () => {
    const user = await open("/app/customers");
    const main = within(await screen.findByRole("main"));
    const mochi = main.getByRole("link", { name: /Owner o1/ });
    expect(mochi).toHaveTextContent("Mochi");
    expect(mochi).toHaveTextContent(/owes\s*Rp\s?50\.000/i);
    expect(main.getByRole("link", { name: /Owner o2/ })).toHaveTextContent(/1 stay/);

    await user.type(main.getByRole("searchbox"), "kopi");
    expect(main.queryByRole("link", { name: /Owner o1/ })).not.toBeInTheDocument();
    expect(main.getByRole("link", { name: /Owner o2/ })).toBeInTheDocument();
  });

  it("says so when nobody matches", async () => {
    const user = await open("/app/customers");
    await user.type(await screen.findByRole("searchbox"), "zzz");
    expect(screen.getByText(/nobody matches “zzz”/i)).toBeInTheDocument();
  });

  it("shows one owner's details, pets and history, and opens a chat on their number", async () => {
    const user = await open("/app/customers");
    await user.click(await screen.findByRole("link", { name: /Owner o1/ }));
    expect(await screen.findByRole("heading", { name: "Owner o1", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open chat/i })).toHaveAttribute("href", "https://wa.me/6281234567890");
    expect(screen.getAllByRole("link", { name: /Mochi/ }).map((l) => l.getAttribute("href"))).toEqual(expect.arrayContaining(["/app/pets/p1"]));
    expect(screen.getByText("Owes").closest(".ds-stat")).toHaveTextContent(rp("50.000"));
  });

  it("corrects a name and number, and refuses a number that belongs to someone else", async () => {
    const user = await open("/app/customers/o1");
    const form = await screen.findByRole("form", { name: /owner details/i });
    const name = within(form).getByLabelText(/^name/i);
    await user.clear(name);
    await user.type(name, "Rina K");
    const wa = within(form).getByLabelText(/whatsapp/i);
    await user.clear(wa);
    await user.type(wa, "0857 1122 3344"); // Owner o2's
    await user.click(within(form).getByRole("button", { name: /^save$/i }));
    expect(await within(form).findByText(/already belongs to Owner o2/i)).toBeInTheDocument();
    expect(stored().owners[0].name).toBe("Owner o1");

    await user.clear(wa);
    await user.type(wa, "0812 0000 1111");
    await user.click(within(form).getByRole("button", { name: /^save$/i }));
    expect(stored().owners[0]).toMatchObject({ name: "Rina K", whatsapp: "6281200001111" });
  });

  it("says so for a customer that doesn't exist", async () => {
    await open("/app/customers/ghost");
    expect(await screen.findByText(/that customer doesn't exist/i)).toBeInTheDocument();
  });
});

describe("payments", () => {
  it("shows what is owed, those who have gone home first, with a reminder to send", async () => {
    await open("/app/payments");
    const main = within(await screen.findByRole("main"));
    const rows = main.getAllByRole("article");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("Mochi");
    expect(rows[0]).toHaveTextContent(rp("50.000"));
    expect(rows[1]).toHaveTextContent("Kopi");
    expect(main.getByText(rp("125.000"), { selector: ".ds-stat__value" })).toBeInTheDocument();

    const link = within(rows[0]).getByRole("link", { name: /send reminder/i });
    expect(link).toHaveAttribute("href", expect.stringMatching(/^https:\/\/wa\.me\/6281234567890\?text=Halo%20Kak%20Owner/));
    expect(decodeURIComponent(link.getAttribute("href")!)).toMatch(/masih ada sisa pembayaran untuk penitipan Mochi/);
  });

  it("filters to one group", async () => {
    const user = await open("/app/payments");
    await user.click(await screen.findByRole("tab", { name: /^staying/i }));
    const articles = screen.getAllByRole("article");
    expect(articles).toHaveLength(1);
    expect(articles[0]).toHaveTextContent("Kopi");
  });

  it("lists recent payments, newest first, linking to the stay", async () => {
    await open("/app/payments");
    const heading = await screen.findByRole("heading", { name: /recent payments/i });
    const items = within(heading.closest("section")!).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByRole("link")).toHaveAttribute("href", expect.stringMatching(/^\/app\/bookings\/b[12]$/));
  });

  it("celebrates when nothing is owed", async () => {
    const settled = hotel();
    settled.bookings = settled.bookings.map((b) => ({ ...b, payments: [pay(500_000)] }));
    await open("/app/payments", settled);
    expect(await screen.findByText(/nothing is owed/i)).toBeInTheDocument();
  });
});

describe("reports", () => {
  it("shows occupancy, money received and the stays of the period", async () => {
    await open("/app/reports");
    const main = within(await screen.findByRole("main"));
    await main.findAllByText("Occupancy");
    expect(main.getByText("Money received").closest(".ds-stat")).toHaveTextContent(rp("125.000"));
    expect(main.getByText("Cancelled").closest(".ds-stat")).toHaveTextContent("0");
  });

  it("switches the period and draws a bar for every day", async () => {
    const user = await open("/app/reports");
    await user.click(await screen.findByRole("tab", { name: /last 30 days/i }));
    const chart = screen.getByRole("figure", { name: /places in use/i });
    expect(within(chart).getAllByRole("listitem")).toHaveLength(30);
  });

  it("narrows every number to one unit or one species, and clears", async () => {
    const user = await open("/app/reports");
    const main = within(await screen.findByRole("main"));
    const received = () => main.getByText("Money received").closest(".ds-stat");
    await user.selectOptions(main.getByLabelText("Unit"), "s2");
    expect(received()).toHaveTextContent(rp("75.000"));
    await user.selectOptions(main.getByLabelText("Unit"), "all");
    await user.selectOptions(main.getByLabelText("Species"), "dog");
    expect(received()).toHaveTextContent(rp("50.000"));
    await user.click(main.getByRole("button", { name: /clear filters/i }));
    expect(received()).toHaveTextContent(rp("125.000"));
  });

  it("breaks the money down by method and lists each unit", async () => {
    await open("/app/reports");
    const main = within(await screen.findByRole("main"));
    const methods = within(await main.findByRole("region", { name: /money in, by method/i }));
    expect(methods.getByText("Cash").closest("li")).toHaveTextContent(rp("125.000"));
    const units = within(main.getByRole("table", { name: /each unit/i }));
    expect(units.getAllByRole("row").slice(1).map((r) => (r as HTMLTableRowElement).cells[0].textContent)).toEqual(expect.arrayContaining(["S1", "S2"]));
  });

  it("takes a custom range", async () => {
    const user = await open("/app/reports");
    await user.click(await screen.findByRole("tab", { name: /custom/i }));
    expect(screen.getByLabelText("From")).toHaveAttribute("type", "date");
    expect(screen.getByLabelText("To")).toHaveValue(today);
  });

  it("asks for cages first when there are none", async () => {
    await open("/app/reports", aSmallHotel({ cages: [] }));
    expect(await screen.findByText(/add cages first/i)).toBeInTheDocument();
  });
});

describe("dashboard", () => {
  it("is in the sidebar in simple mode too, and shows tonight, money and what's owed", async () => {
    await signedInAs({ data: hotel() });
    localStorage.setItem(modeKeyFor("acct-test"), "simple");
    const user = userEvent.setup();
    renderApp("/app");
    await user.click(within(await screen.findByRole("complementary")).getByRole("link", { name: "Dashboard" }));
    const main = within(await screen.findByRole("main"));
    expect(await main.findByRole("heading", { name: "Dashboard", level: 1 })).toBeInTheDocument();
    expect(main.getByText("Full tonight").closest(".ds-stat")).toHaveTextContent("1 of 2 places");
    expect(main.getByText("Still owed").closest(".ds-stat")).toHaveTextContent(rp("125.000"));
    expect(main.getByText("Still owed").closest(".ds-stat")).toHaveTextContent(/1 already gone home/);
  });

  it("forecasts the next 14 nights and lists who to chase", async () => {
    await open("/app/dashboard");
    const main = within(await screen.findByRole("main"));
    expect(within(await main.findByRole("figure", { name: /next 14 nights/i })).getAllByRole("listitem")).toHaveLength(14);
    const chase = within(main.getByRole("region", { name: /to chase/i }));
    expect(chase.getByRole("link", { name: "Mochi" })).toHaveAttribute("href", "/app/bookings/b1");
    expect(chase.getByRole("link", { name: "Kopi" })).toBeInTheDocument();
  });
});

describe("help", () => {
  it("has a first-day guide and answers", async () => {
    await open("/app/help");
    expect(await screen.findByRole("heading", { name: /your first day/i })).toBeInTheDocument();
    expect(screen.getByText(/where is my data kept/i)).toBeInTheDocument();
    expect(screen.getByText(/contact details will be added here soon/i)).toBeInTheDocument();
  });
});

describe("restoring a backup", () => {
  const file = (content: string) => new File([content], "backup.json", { type: "application/json" });

  it("replaces the data after asking", async () => {
    const user = await open("/app/settings");
    const input = await screen.findByLabelText("Restore a backup", { selector: "input" });
    const backup = aSmallHotel({ hotel: { name: "From Backup", city: "", whatsapp: "", createdAt: "" } });
    await user.upload(input, file(JSON.stringify(backup)));
    expect(await screen.findByText(/replace everything in this browser/i)).toBeInTheDocument();
    await user.click(within(document.querySelector("dialog[open]") as HTMLElement).getByRole("button", { name: "Restore a backup" }));
    expect(stored().hotel?.name).toBe("From Backup");
    expect(await screen.findByText(/backup restored/i)).toBeInTheDocument();
  });

  it("refuses a file that isn't a backup and changes nothing", async () => {
    const user = await open("/app/settings");
    await user.upload(await screen.findByLabelText("Restore a backup", { selector: "input" }), file("{nope"));
    expect(await screen.findByText(/isn't a pethommie backup/i)).toBeInTheDocument();
    expect(stored().hotel?.name).toBe("Rumah Meong");
  });

  it("refuses a backup from a newer version", async () => {
    const user = await open("/app/settings");
    await user.upload(await screen.findByLabelText("Restore a backup", { selector: "input" }), file(JSON.stringify({ ...aSmallHotel(), version: 9 })));
    expect(await screen.findByText(/newer version of pethommie/i)).toBeInTheDocument();
    expect(stored().hotel?.name).toBe("Rumah Meong");
  });

  it("restores a backup made by the previous version of the app", async () => {
    const v1 = { version: 1, hotel: aSmallHotel().hotel, cages: aSmallHotel().cages, owners: [], pets: [], bookings: [] };
    expect(parseStored(JSON.stringify(v1)).problem).toBeNull();
    const user = await open("/app/settings");
    await user.upload(await screen.findByLabelText("Restore a backup", { selector: "input" }), file(JSON.stringify(v1)));
    expect(await screen.findByText(/replace everything in this browser/i)).toBeInTheDocument();
  });
});
