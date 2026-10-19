/**
 * Demo mode: mock accounts you can log in with, and a button that fills the sign-up form.
 * On while there is no backend (this is the demo). Set `VITE_DEMO_MODE=false` at build time for a
 * real launch; the mock service and its seeded accounts then stay out of the way.
 */
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE !== "false";
