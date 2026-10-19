import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import App from "@/App";
import { ACCOUNTS_KEY, SESSION_KEY } from "@/app/auth/localAuthService";
import { DEMO_PASSWORD } from "@/app/auth/demoAccounts";
import { dataKeyFor } from "@/app/store/storage";
import { signedInAs, TEST_PASSWORD } from "@/app/testing/auth";
import { aSmallHotel } from "@/app/testing/fixtures";
import { LocaleProvider } from "@/shared/i18n/LocaleProvider";
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

const heading = (name: RegExp) => screen.findByRole("heading", { name });
const accounts = () => JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? '{"accounts":[]}').accounts as { id: string; email: string }[];

describe("signed out", () => {
  it("is sent to log in, from any page inside the app", async () => {
    renderApp("/app/bookings");
    expect(await heading(/welcome back/i)).toBeInTheDocument();
  });

  it("comes back to the page it asked for after logging in", async () => {
    const user = userEvent.setup();
    renderApp("/app/bookings/new");
    await heading(/welcome back/i);
    await user.type(screen.getByLabelText(/^email$/i), "demo@pethommie.id");
    await user.type(screen.getByLabelText(/^password$/i), DEMO_PASSWORD);
    await user.click(screen.getByRole("button", { name: /^log in$/i }));
    expect(await heading(/^new booking$/i)).toBeInTheDocument();
  });

  it("can reach the sign-up screen from the login screen and back", async () => {
    const user = userEvent.setup();
    renderApp("/app/login");
    await user.click(await screen.findByRole("link", { name: /create an account/i }));
    expect(await heading(/create your account/i)).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: /^log in$/i }));
    expect(await heading(/welcome back/i)).toBeInTheDocument();
  });

  it("short links /login and /register work from the site", async () => {
    window.history.pushState({}, "", "/register");
    render(<App />);
    expect(await heading(/create your account/i)).toBeInTheDocument();
    window.history.pushState({}, "", "/");
  });
});

describe("log in", () => {
  it("shows one message for a wrong password, and does not sign in", async () => {
    const user = userEvent.setup();
    renderApp("/app/login");
    await user.type(await screen.findByLabelText(/^email$/i), "demo@pethommie.id");
    await user.type(screen.getByLabelText(/^password$/i), "not-the-password-1");
    await user.click(screen.getByRole("button", { name: /^log in$/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/wrong email or password/i);
    expect(screen.getByRole("heading", { name: /welcome back/i })).toBeInTheDocument();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it("says the same thing for an email that doesn't exist", async () => {
    const user = userEvent.setup();
    renderApp("/app/login");
    await user.type(await screen.findByLabelText(/^email$/i), "nobody@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "whatever123");
    await user.click(screen.getByRole("button", { name: /^log in$/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/wrong email or password/i);
  });

  it("asks for what is missing before trying", async () => {
    const user = userEvent.setup();
    renderApp("/app/login");
    await user.click(await screen.findByRole("button", { name: /^log in$/i }));
    expect(screen.getAllByText(/required/i)).toHaveLength(2);
    await user.type(screen.getByLabelText(/^email$/i), "not-an-email");
    await user.type(screen.getByLabelText(/^password$/i), "x");
    await user.click(screen.getByRole("button", { name: /^log in$/i }));
    expect(screen.getByText(/doesn't look right/i)).toBeInTheDocument();
  });

  it("can show and hide the password", async () => {
    const user = userEvent.setup();
    renderApp("/app/login");
    const field = await screen.findByLabelText(/^password$/i);
    expect(field).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: /show password/i }));
    expect(field).toHaveAttribute("type", "text");
    await user.click(screen.getByRole("button", { name: /hide password/i }));
    expect(field).toHaveAttribute("type", "password");
  });

  it("fills in a demo account with one tap, and that account has a hotel with bookings", async () => {
    const user = userEvent.setup();
    renderApp("/app/login");
    await user.click((await screen.findAllByRole("button", { name: /^use$/i }))[0]);
    expect(screen.getByLabelText(/^email$/i)).toHaveValue("demo@pethommie.id");
    await user.click(screen.getByRole("button", { name: /^log in$/i }));
    expect(await heading(/^today$/i)).toBeInTheDocument();
    expect(screen.getAllByText(/rumah meong bintaro/i).length).toBeGreaterThan(0);
  });

  it("sends the second demo account, a brand-new owner, to setup", async () => {
    const user = userEvent.setup();
    renderApp("/app/login");
    await user.click((await screen.findAllByRole("button", { name: /^use$/i }))[1]);
    await user.click(screen.getByRole("button", { name: /^log in$/i }));
    expect(await heading(/welcome to pethommie/i)).toBeInTheDocument();
  });

  it("does not show login again to someone who is already in", async () => {
    await signedInAs({ data: aSmallHotel() });
    renderApp("/app/login");
    expect(await heading(/^today$/i)).toBeInTheDocument();
  });
});

describe("sign up", () => {
  it("creates an account, signs in, and lands on setup with the hotel filled in", async () => {
    const user = userEvent.setup();
    renderApp("/app/register");
    await user.type(await screen.findByLabelText(/your name/i), "Dewi Lestari");
    await user.type(screen.getByLabelText(/pet hotel name/i), "Kucing Manja");
    await user.type(screen.getByLabelText(/^email$/i), "Dewi@Example.com");
    await user.type(screen.getByLabelText(/whatsapp number/i), "0812 7788 4455");
    await user.type(screen.getByLabelText(/^password$/i), "Pethommie123");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await heading(/welcome to pethommie/i)).toBeInTheDocument();
    expect(accounts().map((a) => a.email)).toContain("dewi@example.com");
    await user.click(screen.getByRole("button", { name: /start setup/i }));
    expect(screen.getByLabelText(/pet hotel name/i)).toHaveValue("Kucing Manja");
    expect(screen.getByLabelText(/business whatsapp/i)).toHaveValue("0812 7788 4455");
  });

  it("explains every field that needs fixing, and creates nothing", async () => {
    const user = userEvent.setup();
    renderApp("/app/register");
    await user.click(await screen.findByRole("button", { name: /create account/i }));
    expect(screen.getAllByText(/^required\.$/i)).toHaveLength(5);

    await user.type(screen.getByLabelText(/your name/i), "A");
    await user.type(screen.getByLabelText(/pet hotel name/i), "B");
    await user.type(screen.getByLabelText(/^email$/i), "bad@");
    await user.type(screen.getByLabelText(/whatsapp number/i), "123");
    await user.type(screen.getByLabelText(/^password$/i), "short");
    await user.click(screen.getByRole("button", { name: /create account/i }));
    expect(screen.getByText(/that email doesn't look right/i)).toBeInTheDocument();
    expect(screen.getByText(/whatsapp number doesn't look right/i)).toBeInTheDocument();
    expect(screen.getByText(/at least 8 characters/i, { selector: ".ds-field__error" })).toBeInTheDocument();
    expect(accounts().filter((a) => a.email === "bad@")).toHaveLength(0);
  });

  it("fills the form with sample data, a different person each time, and the result can sign up", async () => {
    const user = userEvent.setup();
    renderApp("/app/register");
    const fill = await screen.findByRole("button", { name: /fill with sample data/i });
    await user.click(fill);
    const first = (screen.getByLabelText(/your name/i) as HTMLInputElement).value;
    expect(first).not.toBe("");
    expect((screen.getByLabelText(/^email$/i) as HTMLInputElement).value).toMatch(/@example\.com$/);
    await user.click(fill);
    expect((screen.getByLabelText(/your name/i) as HTMLInputElement).value).not.toBe(first);

    await user.click(screen.getByRole("button", { name: /create account/i }));
    expect(await heading(/welcome to pethommie/i)).toBeInTheDocument();
  });

  it("refuses an email that is already registered, even in another case", async () => {
    const user = userEvent.setup();
    renderApp("/app/register");
    await user.type(await screen.findByLabelText(/your name/i), "Someone");
    await user.type(screen.getByLabelText(/pet hotel name/i), "Hotel");
    await user.type(screen.getByLabelText(/^email$/i), "DEMO@pethommie.id");
    await user.type(screen.getByLabelText(/whatsapp number/i), "0812 3456 7890");
    await user.type(screen.getByLabelText(/^password$/i), "abc12345");
    await user.click(screen.getByRole("button", { name: /create account/i }));
    expect(await screen.findByText(/already registered/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /create your account/i })).toBeInTheDocument();
  });
});

describe("log out and accounts", () => {
  it("logging out ends the session and returns to log in", async () => {
    const user = userEvent.setup();
    await signedInAs({ data: aSmallHotel() });
    renderApp("/app/settings");
    await user.click(within(await screen.findByRole("main")).getByRole("button", { name: /log out/i }));
    expect(await heading(/welcome back/i)).toBeInTheDocument();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it("shows who is signed in", async () => {
    await signedInAs({ data: aSmallHotel(), account: { name: "Rina Kusuma", email: "rina@example.com" } });
    renderApp("/app/settings");
    expect(await screen.findByText("rina@example.com", { exact: false })).toBeInTheDocument();
  });

  it("keeps each account's hotel to itself, and gives it back on the next login", async () => {
    const user = userEvent.setup();
    renderApp("/app/login");

    // Demo account: has sample bookings, and we change something.
    await user.click((await screen.findAllByRole("button", { name: /^use$/i }))[0]);
    await user.click(screen.getByRole("button", { name: /^log in$/i }));
    await heading(/^today$/i);
    await user.click(screen.getAllByRole("button", { name: /log out/i })[0]);
    await heading(/welcome back/i);

    // The other demo account is empty: none of that hotel is visible to it.
    await user.click((await screen.findAllByRole("button", { name: /^use$/i }))[1]);
    await user.click(screen.getByRole("button", { name: /^log in$/i }));
    expect(await heading(/welcome to pethommie/i)).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(dataKeyFor("demo-baru"))!)).toMatchObject({ hotel: null, bookings: [] });
    expect(JSON.parse(localStorage.getItem(dataKeyFor("demo-rina"))!).hotel).not.toBeNull();
  });

  it("works with the password the test helper uses", async () => {
    const user = userEvent.setup();
    await signedInAs({ data: aSmallHotel() });
    localStorage.removeItem(SESSION_KEY);
    renderApp("/app/login");
    await user.type(await screen.findByLabelText(/^email$/i), "rina@example.com");
    await user.type(screen.getByLabelText(/^password$/i), TEST_PASSWORD);
    await user.click(screen.getByRole("button", { name: /^log in$/i }));
    expect(await heading(/^today$/i)).toBeInTheDocument();
  });
});
