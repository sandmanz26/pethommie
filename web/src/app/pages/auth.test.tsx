import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import App from "@/App";
import { ACCOUNTS_KEY, SESSION_KEY } from "@/app/auth/localAuthService";
import { OFFER_KEY } from "@/app/demo/offer";
import { dataKeyFor, demoDataKeyFor } from "@/app/store/storage";
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
    await signedInAs({ data: aSmallHotel() });
    localStorage.removeItem(SESSION_KEY);
    renderApp("/app/bookings/new");
    await heading(/welcome back/i);
    await user.type(screen.getByLabelText(/^email$/i), "rina@example.com");
    await user.type(screen.getByLabelText(/^password$/i), TEST_PASSWORD);
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

  it("checks each field as soon as it is left, not while it is first typed", async () => {
    const user = userEvent.setup();
    renderApp("/app/login");
    const email = await screen.findByLabelText(/^email$/i);
    await user.type(email, "rina@");
    expect(screen.queryByText(/doesn't look right/i)).toBeNull();
    await user.tab();
    expect(screen.getByText(/doesn't look right/i)).toBeInTheDocument();
    expect(email).toHaveAttribute("aria-invalid", "true");
    await user.type(email, "example.com");
    expect(screen.queryByText(/doesn't look right/i)).toBeNull();
  });

  it("puts the cursor on the first field to fix", async () => {
    const user = userEvent.setup();
    renderApp("/app/login");
    await user.type(await screen.findByLabelText(/^password$/i), "something1");
    await user.click(screen.getByRole("button", { name: /^log in$/i }));
    expect(screen.getByLabelText(/^email$/i)).toHaveFocus();
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

  it("holds names to a sensible length, and points at the first field to fix", async () => {
    const user = userEvent.setup();
    renderApp("/app/register");
    await user.type(await screen.findByLabelText(/your name/i), "A");
    await user.type(screen.getByLabelText(/pet hotel name/i), "x".repeat(81));
    await user.click(screen.getByRole("button", { name: /create account/i }));
    expect(screen.getByText(/use at least 2 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/keep it under 80 characters/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/your name/i)).toHaveFocus();
    expect(screen.queryByRole("button", { name: /fill with sample data/i })).toBeNull();
  });

  it("refuses an email that is already registered, even in another case", async () => {
    const user = userEvent.setup();
    await signedInAs();
    localStorage.removeItem(SESSION_KEY);
    renderApp("/app/register");
    await user.type(await screen.findByLabelText(/your name/i), "Someone");
    await user.type(screen.getByLabelText(/pet hotel name/i), "Hotel");
    await user.type(screen.getByLabelText(/^email$/i), "RINA@example.com");
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

describe("try now (the demo)", () => {
  it("has its own screen, reached from login, apart from the login form", async () => {
    const user = userEvent.setup();
    renderApp("/app/login");
    expect(screen.queryByRole("button", { name: /^use$/i })).toBeNull();
    await user.click(await screen.findByRole("link", { name: /try the demo/i }));
    expect(await heading(/try pethommie with a sample hotel/i)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /open this demo/i })).toHaveLength(3);
  });

  it("opens a sample hotel with no password, always under the demo strip and the offer with its countdown", async () => {
    const user = userEvent.setup();
    renderApp("/app/try");
    await user.click((await screen.findAllByRole("button", { name: /open this demo/i }))[0]);
    expect(await heading(/^today$/i)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /^demo$/i })).toHaveTextContent(/trying a sample hotel/i);
    const offer = screen.getByRole("complementary", { name: /50% off your first plan/i });
    expect(offer).toHaveTextContent(/ends in 2d 23h 59m \d\ds|ends in 3d 0h 00m 00s/i);
    expect(localStorage.getItem(OFFER_KEY)).not.toBeNull();

    await user.click(screen.getAllByRole("link", { name: /bookings/i })[0]);
    expect(screen.getByRole("region", { name: /^demo$/i })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: /50% off/i })).toBeInTheDocument();
  });

  it("keeps the demo's data apart from real accounts", async () => {
    const user = userEvent.setup();
    const real = await signedInAs({ data: aSmallHotel() });
    localStorage.removeItem(SESSION_KEY);
    const before = localStorage.getItem(dataKeyFor(real.id));
    renderApp("/app/try");
    await user.click((await screen.findAllByRole("button", { name: /open this demo/i }))[0]);
    await heading(/^today$/i);
    expect(JSON.parse(localStorage.getItem(demoDataKeyFor("demo-rina"))!).hotel.name).toBe("Rumah Meong Bintaro");
    expect(localStorage.getItem(dataKeyFor("demo-rina"))).toBeNull();
    expect(localStorage.getItem(dataKeyFor(real.id))).toBe(before);
    expect(accounts().map((a) => a.id)).toEqual([real.id]);
  });

  it("leaves the demo back to its own screen, and the empty sample hotel starts at setup", async () => {
    const user = userEvent.setup();
    renderApp("/app/try");
    await user.click((await screen.findAllByRole("button", { name: /open this demo/i }))[0]);
    await heading(/^today$/i);
    await user.click(screen.getByRole("button", { name: /leave demo/i }));
    expect(await heading(/try pethommie with a sample hotel/i)).toBeInTheDocument();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    await user.click(screen.getByRole("button", { name: /open this demo: start from nothing/i }));
    expect(await heading(/welcome to pethommie/i)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /^demo$/i })).toBeInTheDocument();
  });

  it("claiming the discount leaves the demo for sign-up, and the new account keeps the offer", async () => {
    const user = userEvent.setup();
    renderApp("/app/try");
    await user.click((await screen.findAllByRole("button", { name: /open this demo/i }))[0]);
    await heading(/^today$/i);
    await user.click(screen.getByRole("button", { name: /claim the discount/i }));
    expect(await heading(/create your account/i)).toBeInTheDocument();
    expect(screen.getByText(/your 50% demo discount is saved/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/your name/i), "Dewi Lestari");
    await user.type(screen.getByLabelText(/pet hotel name/i), "Kucing Manja");
    await user.type(screen.getByLabelText(/^email$/i), "dewi@example.com");
    await user.type(screen.getByLabelText(/whatsapp number/i), "0812 7788 4455");
    await user.type(screen.getByLabelText(/^password$/i), "Pethommie123");
    await user.click(screen.getByRole("button", { name: /create account/i }));
    expect(await heading(/welcome to pethommie/i)).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /^demo$/i })).toBeNull();
    const stored = JSON.parse(localStorage.getItem(ACCOUNTS_KEY)!).accounts[0];
    expect(stored.offer).toMatchObject({ code: "DEMO50", percentOff: 50 });
  });

  it("starts the demo over on request, after asking", async () => {
    const user = userEvent.setup();
    renderApp("/app/try");
    await user.click((await screen.findAllByRole("button", { name: /open this demo/i }))[2]);
    await heading(/welcome to pethommie/i);
    await user.click(screen.getByRole("button", { name: /start setup/i }));
    await user.click(screen.getByRole("button", { name: /^start over$/i }));
    await user.click(within(screen.getByRole("dialog", { hidden: true })).getByRole("button", { name: /^start over$/i, hidden: true }));
    expect(await heading(/welcome to pethommie/i)).toBeInTheDocument();
  });
});
