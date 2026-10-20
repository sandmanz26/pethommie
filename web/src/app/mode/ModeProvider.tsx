import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { readMode, writeMode, type Mode } from "./mode";

type ModeValue = { mode: Mode; advanced: boolean; setMode: (mode: Mode) => void };
const ModeContext = createContext<ModeValue | null>(null);

/** The current account's simple/advanced choice. Mount it with a `key` of the account so accounts never share one. */
export function ModeProvider({ accountId, children }: { accountId: string; children: ReactNode }) {
  const [mode, setState] = useState<Mode>(() => readMode(accountId));
  const setMode = useCallback(
    (next: Mode) => {
      writeMode(accountId, next);
      setState(next);
    },
    [accountId],
  );
  const value = useMemo(() => ({ mode, advanced: mode === "advanced", setMode }), [mode, setMode]);
  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMode() {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error("useMode must be used inside <ModeProvider>");
  return ctx;
}
