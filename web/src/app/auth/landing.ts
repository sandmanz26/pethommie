/** Sign-in and sign-up screens use these paths; "go back to where you were" must never point at them. */
const AUTH_PATHS = ["/app/login", "/app/register", "/app/try", "/app/auth/callback"];

/** Where to send someone after signing in: the page they asked for, if it is inside the app, else the app's home. */
export function landingAfterLogin(from: unknown): string {
  if (typeof from !== "string") return "/app";
  const path = from.split("?")[0];
  if (!/^\/app(\/|$)/.test(path) || AUTH_PATHS.includes(path)) return "/app";
  return from;
}
