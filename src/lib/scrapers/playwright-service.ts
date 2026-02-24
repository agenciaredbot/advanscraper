/**
 * Playwright Scraper Microservice — HTTP Client
 *
 * Calls the external Playwright microservice (Railway/local) for scraping
 * that requires a real browser. Follows the same pattern as instagram.ts.
 */

const PLAYWRIGHT_SERVICE_URL =
  process.env.PLAYWRIGHT_SERVICE_URL || "http://localhost:3001";
const PLAYWRIGHT_API_KEY =
  process.env.PLAYWRIGHT_SERVICE_API_KEY || "";

// Reuse the existing interfaces
import type { GoogleMapsResult } from "./google-maps";
import type { LinkedInResult } from "./linkedin";

/**
 * Check if the Playwright microservice is running
 */
export async function checkPlaywrightService(): Promise<boolean> {
  try {
    const res = await fetch(`${PLAYWRIGHT_SERVICE_URL}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Get health details from the Playwright microservice
 */
export async function getPlaywrightServiceHealth(): Promise<{
  status: string;
  activeSessions: number;
  maxSessions: number;
} | null> {
  try {
    const res = await fetch(`${PLAYWRIGHT_SERVICE_URL}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Scrape Google Maps via the Playwright microservice
 */
export async function scrapeGoogleMapsRemote(options: {
  query: string;
  location?: string;
  maxResults?: number;
  extractEmails?: boolean;
}): Promise<GoogleMapsResult[]> {
  const res = await fetch(`${PLAYWRIGHT_SERVICE_URL}/scrape/google-maps`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": PLAYWRIGHT_API_KEY,
    },
    body: JSON.stringify(options),
    signal: AbortSignal.timeout(150000), // 2.5 min (scrape can take long)
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(
      (error as { error?: string }).error ||
        `Playwright service HTTP ${res.status}`
    );
  }

  const data = (await res.json()) as {
    success: boolean;
    results: GoogleMapsResult[];
    count: number;
    duration: number;
  };
  return data.results;
}

/**
 * Scrape LinkedIn profiles via the Playwright microservice
 */
export async function scrapeLinkedInRemote(options: {
  keyword: string;
  location?: string;
  maxResults?: number;
}): Promise<LinkedInResult[]> {
  const res = await fetch(`${PLAYWRIGHT_SERVICE_URL}/scrape/linkedin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": PLAYWRIGHT_API_KEY,
    },
    body: JSON.stringify(options),
    signal: AbortSignal.timeout(150000), // 2.5 min
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(
      (error as { error?: string }).error ||
        `Playwright service HTTP ${res.status}`
    );
  }

  const data = (await res.json()) as {
    success: boolean;
    results: LinkedInResult[];
    count: number;
    duration: number;
  };
  return data.results;
}
