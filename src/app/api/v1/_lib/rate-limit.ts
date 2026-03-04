/**
 * In-memory sliding window rate limiter for API v1.
 *
 * Limits per user per category:
 *   - general:    60 req/min
 *   - scraping:   10 req/min
 *   - ai:         30 req/min
 *   - campaigns:   5 req/min
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

const LIMITS: Record<string, { maxRequests: number; windowMs: number }> = {
  general:   { maxRequests: 60, windowMs: 60_000 },
  scraping:  { maxRequests: 10, windowMs: 60_000 },
  ai:        { maxRequests: 30, windowMs: 60_000 },
  campaigns: { maxRequests: 5,  windowMs: 60_000 },
};

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < 120_000);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}, 5 * 60_000);

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetMs: number;
}

/**
 * Check rate limit for a user + category.
 * Returns whether the request is allowed and rate limit headers.
 */
export function checkRateLimit(
  userId: string,
  category: string = "general"
): RateLimitResult {
  const config = LIMITS[category] || LIMITS.general;
  const key = `${userId}:${category}`;
  const now = Date.now();

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter(
    (t) => now - t < config.windowMs
  );

  const remaining = Math.max(0, config.maxRequests - entry.timestamps.length);

  if (entry.timestamps.length >= config.maxRequests) {
    // Find when the oldest request in the window expires
    const oldestInWindow = entry.timestamps[0];
    const resetMs = oldestInWindow + config.windowMs - now;

    return {
      allowed: false,
      limit: config.maxRequests,
      remaining: 0,
      resetMs,
    };
  }

  // Allowed — record this request
  entry.timestamps.push(now);

  return {
    allowed: true,
    limit: config.maxRequests,
    remaining: remaining - 1,
    resetMs: config.windowMs,
  };
}

/**
 * Build rate limit headers for the response.
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetMs / 1000)),
  };
}
