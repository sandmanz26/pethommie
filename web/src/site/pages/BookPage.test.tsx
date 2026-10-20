import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/shared/i18n/LocaleProvider";
import { encodeCard, type LinkCard } from "@/shared/lib/bookingLink";
import { choose } from "@/shared/testing/select";
import { BookPage } from "./BookPage";

const card: LinkCard = {
  v: 1,
  hotel: "Kandang Ceria",
  city: "Jakarta Selatan",
  wa: "6281399001122",
  lang: "en",
  units: "cage",
  prices: [{ label: "Cage small", price: 60_000 }, { label: "Cat room (per pet)", price: 55_000 }],
  species: ["cat", "dog"],
  note: "Full vaccinations required.",
};

function open(hash: string) {
  const user = userEvent.setup();
  render(
    <LocaleProvider>
      <MemoryRouter initialEntries={[`/book${hash}`]}>
        <Routes>
          <Route path="/book" element={<BookPage />} />
        </Routes>
      </MemoryRouter>
    </LocaleProvider>,
  );
  return user;
}

afterEach(() => vi.restoreAllMocks());

describe("the public booking page", () => {
  it("shows the hotel from its link: name, prices, the pets it takes and its note", () => {
    open(`#${encodeCard(card)}`);
    expect(screen.getByRole("heading", { name: "Kandang Ceria", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("Cat room (per pet)")).toBeInTheDocument();
    expect(screen.getByText(/We take: Cat · Dog/)).toBeInTheDocument();
    expect(screen.getByText("Full vaccinations required.")).toBeInTheDocument();
  });

  it("says so when the link is broken", () => {
    open("#nonsense");
    expect(screen.getByRole("heading", { name: /incomplete/i })).toBeInTheDocument();
  });

  it("checks the request, then opens WhatsApp to the hotel with it written out", async () => {
    const opened = vi.spyOn(window, "open").mockImplementation(() => null);
    const user = open(`#${encodeCard(card)}`);
    await user.click(screen.getByRole("button", { name: /send the request/i }));
    expect(screen.getByText("Please write your name.")).toBeInTheDocument();
    expect(opened).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("Your name"), "Sari");
    await user.type(screen.getByLabelText("Your WhatsApp"), "0812 3456 7890");
    await user.type(screen.getByLabelText("Your pet's name"), "Rex");
    await choose(user, screen.getByLabelText("Kind of pet"), "dog");
    await choose(user, screen.getByLabelText("Your choice"), "Cage small");
    await user.click(screen.getByRole("button", { name: /send the request/i }));

    const url = opened.mock.calls[0][0] as string;
    expect(url.startsWith("https://wa.me/6281399001122?text=")).toBe(true);
    const text = decodeURIComponent(url.split("text=")[1]);
    expect(text).toContain("Hi Kandang Ceria");
    expect(text).toContain("Owner: Sari (0812 3456 7890)");
    expect(text).toContain("Pet: Rex · dog");
    expect(text).toContain("Preference: Cage small");
    expect(text).toMatch(/\/app\/bookings\/new\?in=\d{4}-\d\d-\d\d&out=/);
    expect(screen.getByRole("status")).toHaveTextContent(/press send/i);
  });
});
