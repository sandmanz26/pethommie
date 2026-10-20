import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "@/shared/i18n/LocaleProvider";
import { buildInvoice } from "@/app/domain/invoices";
import { addDays, todayISO } from "@/app/domain/logic";
import { modeKeyFor } from "@/app/mode/mode";
import { dataKeyFor } from "@/app/store/storage";
import { signedInAs } from "@/app/testing/auth";
import { aBooking, aCage, aPet, aSmallHotel, anOwner } from "@/app/testing/fixtures";
import type { HotelData, Invoice, Payment } from "@/app/domain/types";
import AppRoutes from "./AppRoutes";

const today = todayISO();
const stored = (): HotelData => JSON.parse(localStorage.getItem(dataKeyFor("acct-test")) ?? "null");
const rp = (n: string) => new RegExp(`Rp\\s?${n.replace(/\./g, "\\.")}`);
const pay = (id: string, amount: number, over: Partial<Payment> = {}): Payment => ({ id, at: new Date().toISOString(), amount, method: "cash", kind: "payment", reference: "", note: "", ...over });

// Mochi (o1, reads Indonesian) stayed and paid in full: a deposit by QRIS, the rest in cash, and got 20.000 back.
// Kopi (o2, reads English) is staying and has paid nothing; his invoice went out 40 days ago and was due 10 days ago.
function hotel(): HotelData {
  const base = aSmallHotel({
    cages: [aCage("s1"), aCage("s2")],
    owners: [anOwner("o1", "6281234567890"), anOwner("o2", "6285711223344", "en")],
    pets: [aPet("p1", "o1", { name: "Mochi" }), aPet("p3", "o2", { name: "Kopi" })],
    bookings: [
      aBooking("b1", {
        petId: "p1", cageId: "s1", checkIn: addDays(today, -4), checkOut: addDays(today, -2), status: "checked_out",
        payments: [pay("d1", 50_000, { kind: "deposit", method: "qris", reference: "QR-123", at: new Date(Date.now() - 3_600_000).toISOString() }), pay("p2", 70_000), pay("r1", 20_000, { kind: "refund", at: new Date(Date.now() + 1000).toISOString() })],
      }),
      aBooking("b2", { petId: "p3", cageId: "s2", checkIn: addDays(today, -1), checkOut: addDays(today, 2), status: "checked_in" }),
    ],
  });
  const invoice = (bookingId: string, id: string, issuedOn: string, dueOn: string): Invoice => {
    const made = buildInvoice({ ...base, invoices: [] }, bookingId, { id, issuedOn, dueOn });
    if (!("invoice" in made)) throw new Error("no invoice");
    return { ...made.invoice, number: `INV-${id}` };
  };
  return { ...base, invoices: [invoice("b1", "1", today, addDays(today, 7)), invoice("b2", "2", addDays(today, -40), addDays(today, -10))] };
}

async function open(path: string, data = hotel()) {
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

describe("receipts", () => {
  it("opens from a payment on the stay, in the owner's language, with the amount in words and what was left", async () => {
    const user = await open("/app/bookings/b1");
    const panel = within(await screen.findByRole("region", { name: /payments/i }));
    await user.click(panel.getAllByRole("link", { name: /receipt/i })[1]);
    const doc = within(await screen.findByRole("article", { name: /^Kuitansi KW-/ }));
    expect(doc.getByText("Mochi", { exact: false })).toBeInTheDocument();
    expect(doc.getByText("Tujuh puluh ribu rupiah")).toBeInTheDocument();
    expect(doc.getByText("Tunai")).toBeInTheDocument();
    // 100.000 stay: 50.000 deposit + 70.000 -> settled at this point
    expect(doc.getByText("Lunas")).toBeInTheDocument();
  });

  it("writes a refund as a refund note, and sends it on WhatsApp", async () => {
    await open("/app/receipts/b1/r1");
    expect(await screen.findByRole("article", { name: /^Bukti pengembalian dana KW-/ })).toBeInTheDocument();
    const wa = screen.getByRole("link", { name: /whatsapp/i });
    expect(wa).toHaveAttribute("href", expect.stringContaining("https://wa.me/6281234567890?text="));
    expect(decodeURIComponent(wa.getAttribute("href")!)).toMatch(/mengembalikan Rp 20\.000/);
  });

  it("says so when the payment isn't there", async () => {
    await open("/app/receipts/b1/nope");
    expect(await screen.findByText(/that payment doesn't exist/i)).toBeInTheDocument();
  });
});

describe("transactions", () => {
  it("lists every payment and refund with its receipt, totals by method, and filters", async () => {
    const user = await open("/app/transactions");
    const main = within(await screen.findByRole("main"));
    const table = within(await main.findByRole("table", { name: "Transactions" }));
    expect(table.getAllByRole("row")).toHaveLength(4);
    expect(table.getAllByRole("link", { name: /^KW-/ })[0]).toHaveAttribute("href", "/app/receipts/b1/r1");
    expect(main.getByText("Money in").closest(".ds-stat")).toHaveTextContent(rp("120.000"));
    expect(main.getByText("Refunds").closest(".ds-stat")).toHaveTextContent(rp("20.000"));
    expect(main.getByText("Net").closest(".ds-stat")).toHaveTextContent(rp("100.000"));

    await user.selectOptions(main.getByLabelText("Method"), "qris");
    expect(table.getAllByRole("row")).toHaveLength(2);
    await user.selectOptions(main.getByLabelText("Method"), "all");
    await user.type(main.getByRole("searchbox"), "QR-123");
    expect(table.getAllByRole("row")).toHaveLength(2);
  });
});

describe("invoice register", () => {
  it("shows what is paid and what is past due, across months", async () => {
    const user = await open("/app/invoices");
    const main = within(await screen.findByRole("main"));
    await user.click(main.getByLabelText("All months"));
    const table = within(main.getByRole("table", { name: "Invoices" }));
    const late = table.getByRole("link", { name: "INV-2" }).closest("tr")!;
    expect(late).toHaveTextContent("Past due");
    expect(late).toHaveTextContent("10 days late");
    expect(table.getByRole("link", { name: "INV-1" }).closest("tr")).toHaveTextContent("Paid");
    expect(main.getByText("Still to be paid").closest(".ds-stat")).toHaveTextContent(rp("150.000"));

    await user.click(main.getByRole("tab", { name: /past due/i }));
    expect(table.queryByRole("link", { name: "INV-1" })).not.toBeInTheDocument();
    await user.type(main.getByRole("searchbox"), "Mochi");
    expect(main.getByText(/no invoice matches/i)).toBeInTheDocument();
  });

  it("chases a late invoice from its page and takes the payment there", async () => {
    const user = await open("/app/invoices/2");
    expect(await screen.findByText(/past due: 10 days late/i)).toBeInTheDocument();
    const remind = screen.getByRole("link", { name: /send a reminder/i });
    expect(decodeURIComponent(remind.getAttribute("href")!)).toMatch(/INV-2[\s\S]*lewat jatuh tempo[\s\S]*Rp 150\.000/);

    const panel = within(screen.getByRole("region", { name: /payments for this stay/i }));
    await user.type(panel.getByLabelText(/amount/i), "150000");
    await user.click(panel.getByRole("button", { name: /save payment/i }));
    expect(stored().bookings.find((b) => b.id === "b2")?.payments).toHaveLength(1);
    expect(screen.queryByText(/past due:/i)).not.toBeInTheDocument();
  });
});
