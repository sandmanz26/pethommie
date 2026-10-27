import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AuthProvider } from "@/app/auth/AuthProvider";
import type { AuthService } from "@/app/auth/AuthService";
import { LocaleProvider } from "@/shared/i18n/LocaleProvider";
import { AuthCallbackPage } from "./AuthCallbackPage";
import { LoginPage } from "./LoginPage";
import { RegisterPage } from "./RegisterPage";

function googleOnly(over: Partial<AuthService> = {}): AuthService {
  return {
    methods: { password: false, google: true },
    restore: vi.fn(async () => null),
    signInWithGoogle: vi.fn(async () => ({ ok: true as const })),
    register: vi.fn(async () => ({ ok: false as const, error: "unsupported" as const })),
    login: vi.fn(async () => ({ ok: false as const, error: "unsupported" as const })),
    tryDemo: vi.fn(async () => ({ ok: false as const, error: "invalid_credentials" as const })),
    logout: vi.fn(async () => {}),
    ...over,
  };
}

function show(path: string, service: AuthService) {
  render(
    <LocaleProvider>
      <AuthProvider service={service}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/app/login" element={<LoginPage />} />
            <Route path="/app/register" element={<RegisterPage />} />
            <Route path="/app/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/app/*" element={<p>in the app</p>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </LocaleProvider>,
  );
  return userEvent.setup();
}

describe("signing up and in with Google", () => {
  it("offers only Google on sign-up, with no password form, and goes to Google on tap", async () => {
    const service = googleOnly();
    const user = show("/app/register", service);
    const button = await screen.findByRole("button", { name: "Continue with Google" });
    expect(screen.queryByLabelText(/^password$/i)).toBeNull();
    expect(screen.getByText(/hotel's name and whatsapp come next/i)).toBeInTheDocument();
    await user.click(button);
    expect(service.signInWithGoogle).toHaveBeenCalledWith("/app");
  });

  it("logs in with Google, and says how to sign up with the same button", async () => {
    const service = googleOnly();
    const user = show("/app/login", service);
    await user.click(await screen.findByRole("button", { name: "Continue with Google" }));
    expect(service.signInWithGoogle).toHaveBeenCalledWith("/app");
    expect(screen.getByText(/the same button creates your account/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^email$/i)).toBeNull();
  });

  it("says so when Google can't be reached, and lets the visitor try again", async () => {
    const service = googleOnly({ signInWithGoogle: vi.fn(async () => ({ ok: false as const, error: "network" as const })) });
    const user = show("/app/login", service);
    await user.click(await screen.findByRole("button", { name: "Continue with Google" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't start/i);
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeEnabled();
  });

  it("on the way back, goes on into the app once signed in", async () => {
    const service = googleOnly({ restore: vi.fn(async () => ({ id: "u1", provider: "supabase" as const, name: "Rina", email: "r@gmail.com", whatsapp: "", hotelName: "", createdAt: "" })) });
    show("/app/auth/callback?next=%2Fapp%2Fcalendar", service);
    expect(await screen.findByText("in the app")).toBeInTheDocument();
  });

  it("on the way back, explains a refusal and offers the login screen", async () => {
    show("/app/auth/callback?error=access_denied&error_description=The+user+denied+access", googleOnly());
    expect(await screen.findByText("The user denied access")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to log in/i })).toBeInTheDocument();
  });
});
