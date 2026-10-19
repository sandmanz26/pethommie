import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Registers the service worker that lets the app open without a connection, and reports the two moments
 * worth telling the operator about: a new version is waiting, and the app is now ready to work offline.
 * It does nothing in development and tests, or in a browser without service workers.
 */
export function useServiceWorker() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const apply = useRef<((reload?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
    let stopped = false;
    import("virtual:pwa-register")
      .then(({ registerSW }) => {
        if (stopped) return;
        apply.current = registerSW({
          immediate: true,
          onNeedRefresh: () => setNeedRefresh(true),
          onOfflineReady: () => setOfflineReady(true),
        });
      })
      .catch(() => undefined); // The app works without it.
    return () => {
      stopped = true;
    };
  }, []);

  /** Loads the new version. Nothing is lost: everything is saved as it is typed in. */
  const reload = useCallback(() => void apply.current?.(true), []);
  const dismiss = useCallback(() => (setNeedRefresh(false), setOfflineReady(false)), []);
  return { needRefresh, offlineReady, reload, dismiss };
}
