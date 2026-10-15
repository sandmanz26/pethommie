const RELOADED_KEY = "pethommie.reloadedForNewVersion";

/** The browser's messages when a lazy-loaded file is gone (Chromium, Safari, Firefox). */
const PATTERNS = [/failed to fetch dynamically imported module/i, /importing a module script failed/i, /error loading dynamically imported module/i];

export function isStaleDeployError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return PATTERNS.some((p) => p.test(message));
}

/** Reloads to pick up the new version, once per tab session, so a real outage can't loop. */
export function reloadOnceForNewVersion() {
  try {
    if (sessionStorage.getItem(RELOADED_KEY)) return;
    sessionStorage.setItem(RELOADED_KEY, "1");
  } catch {
    return;
  }
  window.location.reload();
}
