/**
 * Standardized API v1 response helpers.
 *
 * Success: { data, meta? }
 * Error:   { error: { code, message } }
 */

import { NextResponse } from "next/server";
import { ServiceError, toErrorResponse } from "@/lib/services/errors";
import { rateLimitHeaders, type RateLimitResult } from "./rate-limit";

// ─── Success Responses ───────────────────────────────────────────────────────

export function apiSuccess<T>(
  data: T,
  options?: {
    status?: number;
    meta?: Record<string, unknown>;
    rateLimit?: RateLimitResult;
  }
) {
  const body: Record<string, unknown> = { data };
  if (options?.meta) body.meta = options.meta;

  const headers: Record<string, string> = {};
  if (options?.rateLimit) {
    Object.assign(headers, rateLimitHeaders(options.rateLimit));
  }

  return NextResponse.json(body, {
    status: options?.status || 200,
    headers,
  });
}

// ─── Error Responses ─────────────────────────────────────────────────────────

export function apiError(
  error: unknown,
  rateLimit?: RateLimitResult
) {
  const { error: errBody, statusCode } = toErrorResponse(error);

  const headers: Record<string, string> = {};
  if (rateLimit) {
    Object.assign(headers, rateLimitHeaders(rateLimit));
  }

  return NextResponse.json(
    { error: errBody },
    { status: statusCode, headers }
  );
}

export function apiUnauthorized() {
  return NextResponse.json(
    { error: { code: "UNAUTHORIZED", message: "API key invalida o ausente. Usa: Authorization: Bearer ask_..." } },
    { status: 401 }
  );
}

export function apiRateLimited(rateLimit: RateLimitResult) {
  return NextResponse.json(
    { error: { code: "RATE_LIMITED", message: "Limite de solicitudes excedido. Intenta de nuevo mas tarde." } },
    {
      status: 429,
      headers: rateLimitHeaders(rateLimit),
    }
  );
}

// ─── Guard Helper ────────────────────────────────────────────────────────────

import { getApiKeyUser, type ApiKeyUser } from "./auth";
import { checkRateLimit } from "./rate-limit";

/**
 * All-in-one guard for API v1 routes.
 * Authenticates, rate limits, and returns the user + rateLimit result.
 * If auth or rate limit fails, returns a NextResponse to send immediately.
 */
export async function apiGuard(
  request: Request,
  rateLimitCategory: string = "general"
): Promise<
  | { ok: true; user: ApiKeyUser; rateLimit: RateLimitResult }
  | { ok: false; response: NextResponse }
> {
  const user = await getApiKeyUser(request);
  if (!user) {
    return { ok: false, response: apiUnauthorized() };
  }

  const rateLimit = checkRateLimit(user.userId, rateLimitCategory);
  if (!rateLimit.allowed) {
    return { ok: false, response: apiRateLimited(rateLimit) };
  }

  return { ok: true, user, rateLimit };
}
