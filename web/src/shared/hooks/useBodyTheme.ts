import { useLayoutEffect } from "react";

/**
 * Marks <body> with the surface that is showing ("site" or "app"). Each surface scopes its palette
 * and page rules to that class, so neither can leak into the other. A layout effect, so it is set
 * before the first paint of the route.
 */
export function useBodyTheme(theme: "site" | "app") {
  useLayoutEffect(() => {
    document.body.className = theme;
  }, [theme]);
}
