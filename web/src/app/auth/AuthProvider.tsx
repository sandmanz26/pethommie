import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AuthMethods, AuthService } from "./AuthService";
import { authService } from "./defaultService";
import type { Account, AuthResult, Offer, Registration } from "./types";

/** `leaveTo`: where a signed-out visitor goes next, when logging out chose somewhere other than the login screen. */
type State = { status: "loading" | "signedOut" | "signedIn"; account: Account | null; leaveTo?: string };

type AuthValue = State & {
  login(email: string, password: string): Promise<AuthResult>;
  register(input: Registration, offer?: Offer): Promise<AuthResult>;
  tryDemo(accountId: string): Promise<AuthResult>;
  methods: AuthMethods;
  signInWithGoogle: AuthService["signInWithGoogle"];
  /** Ends the session; `leaveTo` is where to go instead of the login screen (leaving the demo, say). */
  logout(leaveTo?: string): Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

/** Who is signed in, and the three ways that changes. Wraps everything under /app. */
export function AuthProvider({ children, service = authService }: { children: ReactNode; service?: AuthService }) {
  const [state, setState] = useState<State>({ status: "loading", account: null });

  useEffect(() => {
    let current = true;
    service
      .restore()
      .catch(() => null)
      .then((account) => {
        if (current) setState(account ? { status: "signedIn", account } : { status: "signedOut", account: null });
      });
    // Session changes the app didn't make itself (Google's return, a refresh in another tab).
    const stop = service.onChange?.((account) => {
      if (current) setState(account ? { status: "signedIn", account } : { status: "signedOut", account: null });
    });
    return () => {
      current = false;
      stop?.();
    };
  }, [service]);

  const value = useMemo<AuthValue>(() => {
    const enter = (result: AuthResult) => {
      if (result.ok) setState({ status: "signedIn", account: result.account });
      return result;
    };
    return {
      ...state,
      login: async (email, password) => enter(await service.login(email, password)),
      register: async (input, offer) => enter(await service.register(input, offer)),
      tryDemo: async (accountId) => enter(await service.tryDemo(accountId)),
      methods: service.methods,
      signInWithGoogle: (next) => service.signInWithGoogle(next),
      logout: async (leaveTo?: string) => {
        await service.logout();
        setState({ status: "signedOut", account: null, leaveTo });
      },
    };
  }, [state, service]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** For screens that only exist once you are signed in. */
// eslint-disable-next-line react-refresh/only-export-components
export function useAccount(): Account {
  const { account } = useAuth();
  if (!account) throw new Error("useAccount needs a signed-in account");
  return account;
}
