import type { FeatureIcon } from "@/site/i18n/en";

const paths: Record<FeatureIcon, string> = {
  calendar: "M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM8 13h2M12 13h2M8 17h2M12 17h2",
  check: "M9 4h6v3H9zM7 5.5H5V21h14V5.5h-2M8.5 13.5l2.5 2.5 4.5-5",
  log: "M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01",
  chat: "M4 20l1.2-4A8 8 0 1 1 8 18.8L4 20zM9 10h6M9 13.5h4",
  invoice: "M6 3h9l4 4v14H6zM14 3v5h5M9 12h6M9 16h6",
  chart: "M4 20V5M4 20h16M8 16v-4M12 16V8M16 16v-6",
  offline: "M2.5 8.5a15 15 0 0 1 4.3-2.7M11 5.1a15 15 0 0 1 10.5 3.4M5.5 12a10 10 0 0 1 3.6-2.1M15.4 10.3a10 10 0 0 1 3.1 1.7M8.8 15.4a5 5 0 0 1 6.4 0M12 19h.01M3 3l18 18",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
};

/** A simple stroked icon for the landing page. Decorative: its meaning is always written beside it. */
export function LineIcon({ name, size = 22 }: { name: FeatureIcon; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}
