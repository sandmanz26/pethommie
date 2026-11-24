import { defaultDeps, type Deps } from "./deps.js";
import { ApiError, errorResponse, json } from "./http.js";

export type Handler<D = Deps> = (req: Request, deps: D) => Promise<Response>;

/**
 * Turns a handler into a Vercel function (`export const GET = route(handler)`): real dependencies, and every
 * failure answered as JSON. Unexpected errors are logged (Vercel → Logs) but never sent to the client.
 * A handler that needs more than plain Deps (e.g. EmailDeps) passes its own deps factory as the second argument.
 */
export function route<D = Deps>(handler: Handler<D>, deps?: () => D): (req: Request) => Promise<Response> {
  return async (req) => {
    try {
      const build = (deps ?? (defaultDeps as unknown as () => D))();
      return await handler(req, build);
    } catch (e) {
      if (e instanceof ApiError) return errorResponse(e);
      console.error(e);
      return json({ error: { code: "internal", message: "Something went wrong on the server." } }, 500);
    }
  };
}
