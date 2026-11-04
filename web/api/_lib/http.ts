/**
 * JSON in, JSON out, and one error shape for every endpoint:
 *   { "error": { "code": "double_booking", "message": "...", "fields": { "checkIn": "..." } } }
 * `code` is stable (clients branch on it); `message` is for people; `fields` only for invalid input.
 */

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: Record<string, string>;
  readonly headers?: Record<string, string>;

  constructor(status: number, code: string, message: string, extra: { fields?: Record<string, string>; headers?: Record<string, string> } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = extra.fields;
    this.headers = extra.headers;
  }
}

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });
}

export function errorResponse(e: ApiError): Response {
  return json({ error: { code: e.code, message: e.message, ...(e.fields ? { fields: e.fields } : {}) } }, e.status, e.headers);
}

/** Request bodies are small forms; anything bigger is a mistake or abuse. */
export const MAX_BODY_BYTES = 32 * 1024;

/** The body as an object: JSON, or a plain HTML form (application/x-www-form-urlencoded). */
export async function readBody(req: Request): Promise<Record<string, unknown>> {
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) throw new ApiError(413, "too_large", "The request body is too large.");
  const text = await req.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) throw new ApiError(413, "too_large", "The request body is too large.");
  const type = (req.headers.get("content-type") ?? "").toLowerCase();
  if (type.startsWith("application/x-www-form-urlencoded")) {
    return Object.fromEntries(new URLSearchParams(text));
  }
  if (!type.startsWith("application/json")) {
    throw new ApiError(415, "unsupported_media_type", "Send JSON with the header Content-Type: application/json.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ApiError(400, "bad_json", "The request body is not valid JSON.");
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new ApiError(400, "bad_json", "The request body must be a JSON object.");
  }
  return parsed as Record<string, unknown>;
}
