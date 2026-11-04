import { defaultDeps, type Deps } from "./deps.js";
import { ApiError, errorResponse, json } from "./http.js";

export type Handler = (req: Request, deps: Deps) => Promise<Response>;

/**
 * Turns a handler into a Vercel function (`export const GET = route(handler)`): real dependencies, and every
 * failure answered as JSON. Unexpected errors are logged (Vercel → Logs) but never sent to the client.
 */
export function route(handler: Handler, deps?: () => Deps): (req: Request) => Promise<Response> {
  return async (req) => {
    try {
      return await handler(req, (deps ?? defaultDeps)());
    } catch (e) {
      if (e instanceof ApiError) return errorResponse(e);
      console.error(e);
      return json({ error: { code: "internal", message: "Something went wrong on the server." } }, 500);
    }
  };
}
