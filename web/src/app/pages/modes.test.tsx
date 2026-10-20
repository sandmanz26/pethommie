import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "@/shared/i18n/LocaleProvider";
import { addDays, todayISO } from "@/app/domain/logic";
import { modeKeyFor, readMode, type Mode } from "@/app/mode/mode";
import { dataKeyFor } from "@/app/store/storage";
import { signedInAs } from "@/app/testing/auth";
import { aBooking, aCareEntry, aSmallHotel } from "@/app/testing/fixtures";
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
const stay = (over = {}) => aBooking("b1", { petId: "p1", cageId: "s1", checkIn: today, checkOut: addDays(today, 3), ...over });
const stored = () => JSON.parse(localStorage.getItem(dataKeyFor("acct-test")) ?? "null");

async function open(path: string, mode?: Mode, bookings = [stay()], extra = {}) {
  await signedInAs({ data: aSmallHotel({ bookings, ...extra }) });
  if (mode) localStorage.setItem(modeKeyFor("acct-test"), mode);
  const user = userEvent.setup();
  renderApp(path);
  return user;
}

const sidebar = () => within(screen.getByRole("complementary"));

describe("simple and advanced mode", () => {
  it("starts simple, and says nothing about it until asked", async () => {
    await open("/app");
    await screen.findByRole("heading", { name: "Today", level: 1 });
    expect(readMode("acct-test")).toBe("simple");
    expect(sidebar().getByRole("tab", { name: "Simple", selected: true })).toBeInTheDocument();
  });

  it("offers the everyday pages, the dashboard and reports in simple mode and adds customers, payments, invoices and tax in advanced", async () => {
    const user = await open("/app");
    await screen.findByRole("heading", { name: "Today", level: 1 });
    for (const hidden of ["Customers", "Payments", "Invoices", "Tax"]) expect(sidebar().queryByRole("link", { name: hidden })).not.toBeInTheDocument();
    for (const shown of ["Today", "Dashboard", "Bookings", "Calendar", "Reports", "Pets", "Cages", "Settings", "Help"]) expect(sidebar().getByRole("link", { name: shown })).toBeInTheDocument();

    await user.click(sidebar().getByRole("tab", { name: "Advanced" }));
    for (const shown of ["Customers", "Payments", "Invoices", "Reports", "Tax"]) expect(sidebar().getByRole("link", { name: shown })).toBeInTheDocument();
  });

  it("remembers the choice for this account, and only this account", async () => {
    const user = await open("/app");
    await screen.findByRole("complementary");
    await user.click(sidebar().getByRole("tab", { name: "Advanced" }));
    expect(localStorage.getItem(modeKeyFor("acct-test"))).toBe("advanced");
    expect(readMode("someone-else")).toBe("simple");
  });

  it("keeps only the everyday four and More on the phone's tab bar, and lists the rest under More", async () => {
    const user = await open("/app");
    const tabs = within((await screen.findAllByRole("navigation", { name: "App" })).find((n) => n.classList.contains("ds-tabbar"))!);
    expect(tabs.getAllByRole("link").map((l) => l.textContent)).toEqual(["Today", "Bookings", "Calendar", "Pets", "More"]);
    await user.click(tabs.getByRole("link", { name: "More" }));
    const more = within(await screen.findByRole("navigation", { name: "More" }));
    expect(more.getAllByRole("link").map((l) => l.textContent)).toEqual(["Dashboard", "Reports", "Cages", "Settings", "Help", "Back to website"]);
    await user.click(screen.getAllByRole("tab", { name: "Advanced" })[0]);
    expect(within(screen.getByRole("navigation", { name: "More" })).getAllByRole("link").map((l) => l.textContent)).toEqual(["Dashboard", "Customers", "Payments", "Invoices", "Reports", "Tax", "Cages", "Settings", "Help", "Back to website"]);
  });

  it("can be switched in Settings too, and says what each one is", async () => {
    const user = await open("/app/settings");
    const main = within(await screen.findByRole("main"));
    expect(main.getByText(/just what you need every day/i)).toBeInTheDocument();
    await user.click(main.getByRole("tab", { name: "Advanced" }));
    expect(main.getByText(/customers, payments, invoices, tax and every option/i)).toBeInTheDocument();
  });
});

describe("what simple mode leaves out", () => {
  it("asks little at check-in: the two checks and the weight", async () => {
    await open("/app/bookings/b1", "simple");
    await screen.findByRole("heading", { name: /check-in record/i });
    expect(screen.getByLabelText(/weight/i)).toBeInTheDocument();
    for (const gone of [/belongings/i, /food from the owner/i, /marks, wounds/i]) expect(screen.queryByLabelText(gone)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /without a record/i })).not.toBeInTheDocument();
  });

  it("still records the arrival it asked for", async () => {
    const user = await open("/app/bookings/b1", "simple");
    await user.type(await screen.findByLabelText(/weight/i), "4");
    await user.click(screen.getByRole("button", { name: /^check in$/i }));
    expect(stored().bookings[0]).toMatchObject({ status: "checked_in", arrival: { weightKg: 4, healthy: true, fleaFree: true } });
  });

  it("records the whole balance with one tap", async () => {
    const user = await open("/app/bookings/b1", "simple", [stay({ status: "checked_in", payments: [{ id: "d", at: new Date().toISOString(), amount: 50_000, method: "cash", kind: "payment" as const, reference: "", note: "" }] })]);
    const panel = await screen.findByRole("region", { name: /payments/i });
    expect(within(panel).queryByLabelText(/note/i)).not.toBeInTheDocument();
    await user.click(within(panel).getByRole("button", { name: /mark as paid in full/i }));
    expect(stored().bookings[0].payments.map((p: { amount: number }) => p.amount)).toEqual([50_000, 100_000]);
    expect(within(panel).getByText("Paid in full")).toBeInTheDocument();
  });

  it("logs a meal with one tap and no time or details to fill in, but asks for words on a note", async () => {
    const user = await open("/app/bookings/b1", "simple", [stay({ status: "checked_in" })]);
    const log = await screen.findByRole("region", { name: /daily care log/i });
    expect(within(log).queryByLabelText(/^time/i)).not.toBeInTheDocument();
    expect(within(log).queryByLabelText(/details/i)).not.toBeInTheDocument();
    await user.click(within(log).getByRole("button", { name: "All eaten" }));
    expect(stored().careLog).toHaveLength(1);

    await user.click(within(log).getByRole("button", { name: /^note$/i }));
    expect(within(log).getByLabelText(/details/i)).toBeInTheDocument();
  });

  it("shows the owner's report but not the other ready-made messages", async () => {
    await open("/app/bookings/b1", "simple", [stay({ status: "checked_in" })], { careLog: [aCareEntry("c1", "b1", { at: new Date().toISOString() })] });
    await screen.findByRole("region", { name: /report for the owner/i });
    expect(screen.queryByRole("region", { name: /messages to the owner/i })).not.toBeInTheDocument();
  });

  it("books without a cage-size filter", async () => {
    await open("/app/bookings/new", "simple");
    await screen.findByLabelText(/^cage ·/i);
    expect(screen.queryByLabelText(/cage size/i)).not.toBeInTheDocument();
  });

  it("shows all of it in advanced mode", async () => {
    await open("/app/bookings/new", "advanced");
    expect(await screen.findByLabelText(/cage size/i)).toBeInTheDocument();
  });
});
