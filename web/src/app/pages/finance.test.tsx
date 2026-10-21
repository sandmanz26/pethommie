import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "@/shared/i18n/LocaleProvider";
import { choose } from "@/shared/testing/select";
import { addDays, todayISO } from "@/app/domain/logic";
import { modeKeyFor } from "@/app/mode/mode";
import { dataKeyFor } from "@/app/store/storage";
import { signedInAs } from "@/app/testing/auth";
import { aBooking, aCage, aSmallHotel } from "@/app/testing/fixtures";
import type { Expense, HotelData } from "@/app/domain/types";
import AppRoutes from "./AppRoutes";

const today = todayISO();
const month = today.slice(0, 7);
const stored = (): HotelData => JSON.parse(localStorage.getItem(dataKeyFor("acct-test")) ?? "null");
const rp = (n: string) => new RegExp(`Rp\\s?${n.replace(/\./g, "\\.")}`);
const spend = (id: string, date: string, category: Expense["category"], amount: number, over: Partial<Expense> = {}): Expense => ({ id, date, category, amount, method: "transfer", vendor: "", note: "", recurring: false, ...over });
const firstOfMonth = `${month}-01`;
const lastMonthDay = addDays(firstOfMonth, -5);

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

describe("expenses", () => {
  it("records an expense, totals it by kind, and corrects it", async () => {
    const user = await open("/app/expenses", aSmallHotel());
    const form = within(await screen.findByRole("form", { name: /record an expense/i }));
    await user.type(form.getByLabelText(/amount/i), "350000");
    await choose(user, form.getByLabelText("Category"), "food");
    await user.type(form.getByLabelText(/paid to/i), "Toko Pakan");
    await user.click(form.getByRole("button", { name: /save expense/i }));
    expect(stored().expenses).toEqual([expect.objectContaining({ category: "food", amount: 350_000, vendor: "Toko Pakan", date: today })]);
    const main = within(screen.getByRole("main"));
    expect(main.getByText("Direct costs", { selector: ".ds-stat__label" }).closest(".ds-stat")).toHaveTextContent(rp("350.000"));

    await user.click(main.getByRole("button", { name: /edit pet food/i }));
    const editing = within(screen.getByRole("form", { name: /edit expense/i }));
    await user.clear(editing.getByLabelText(/amount/i));
    await user.type(editing.getByLabelText(/amount/i), "400000");
    await user.click(editing.getByRole("button", { name: /save expense/i }));
    expect(stored().expenses.map((e) => e.amount)).toEqual([400_000]);
  });

  it("refuses an expense without an amount", async () => {
    const user = await open("/app/expenses", aSmallHotel());
    await user.click(await screen.findByRole("button", { name: /save expense/i }));
    expect(screen.getByText(/enter an amount above zero/i)).toBeInTheDocument();
    expect(stored()?.expenses ?? []).toEqual([]);
  });

  it("brings last month's recurring costs into this month in one tap", async () => {
    const data = { ...aSmallHotel(), expenses: [spend("rent", lastMonthDay, "rent", 2_500_000, { vendor: "Bu Lina", recurring: true }), spend("food", lastMonthDay, "food", 100_000)] };
    const user = await open("/app/expenses", data);
    await user.click(await screen.findByRole("button", { name: /add last month's recurring cost/i }));
    const now = stored().expenses.filter((e) => e.date.startsWith(month));
    expect(now).toEqual([expect.objectContaining({ category: "rent", amount: 2_500_000, vendor: "Bu Lina", recurring: true })]);
    expect(screen.queryByRole("button", { name: /recurring cost/i })).not.toBeInTheDocument();
  });

  it("deletes after asking", async () => {
    const user = await open("/app/expenses", { ...aSmallHotel(), expenses: [spend("e1", today, "vet", 90_000)] });
    await user.click(await screen.findByRole("button", { name: /delete vet/i }));
    await user.click(within(document.querySelector("dialog[open]") as HTMLElement).getByRole("button", { name: "Delete" }));
    expect(stored().expenses).toEqual([]);
  });
});

describe("the finance report", () => {
  // This month: a stay paid 200.000; spent 60.000 on food (direct) and 100.000 on rent (operating).
  const data = (): HotelData => ({
    ...aSmallHotel({
      cages: [aCage("s1", "S", 50_000)],
      bookings: [aBooking("b1", { petId: "p1", cageId: "s1", checkIn: firstOfMonth, checkOut: addDays(firstOfMonth, 4), status: "checked_out", payments: [{ id: "p", at: new Date().toISOString(), amount: 200_000, method: "cash", kind: "payment", reference: "", note: "" }] })],
    }),
    expenses: [spend("f", today, "food", 60_000), spend("r", today, "rent", 100_000)],
  });

  it("shows income, expenses and what is left, as a statement and in charts", async () => {
    await open("/app/finance", data());
    const main = within(await screen.findByRole("main"));
    expect(main.getByText("Income", { selector: ".ds-stat__label" }).closest(".ds-stat")).toHaveTextContent(rp("200.000"));
    expect(main.getByText("Expenses", { selector: ".ds-stat__label" }).closest(".ds-stat")).toHaveTextContent(rp("160.000"));
    expect(main.getByText("Profit", { selector: ".ds-stat__label" }).closest(".ds-stat")).toHaveTextContent(rp("40.000"));
    const statement = within(main.getByRole("table", { name: /profit and loss statement/i }));
    expect(statement.getByRole("rowheader", { name: "Gross profit" }).closest("tr")).toHaveTextContent(rp("140.000"));
    expect(statement.getByRole("rowheader", { name: "Net profit" }).closest("tr")).toHaveTextContent(rp("40.000"));
    expect(within(main.getByRole("figure", { name: /income and expenses, month by month/i })).getAllByRole("listitem")).toHaveLength(6);
    expect(within(main.getByRole("figure", { name: /profit, month by month/i })).getAllByRole("listitem")).toHaveLength(6);
  });

  it("works out the break-even in nights a month", async () => {
    await open("/app/finance", data());
    const panel = within(await screen.findByRole("region", { name: "Break-even" }));
    // 4 nights at 50.000; 15.000 direct per night; 100.000 rent -> 100.000 / 35.000 = 2.9 -> 3 nights
    expect(panel.getByText(/3 place-nights a month cover all your costs/)).toBeInTheDocument();
  });

  it("says plainly when nothing has been spent yet, and points to where to record it", async () => {
    await open("/app/finance", { ...data(), expenses: [] });
    expect(await screen.findByRole("link", { name: "Record expenses" })).toBeInTheDocument();
    expect(screen.getAllByText(/no expenses recorded in this period/i)[0]).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Record expenses" })).toHaveAttribute("href", "/app/expenses");
  });
});
