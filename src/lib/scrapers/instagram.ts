/**
 * Instagram Scraper — Client for Playwright microservice on Railway
 *
 * The actual scraping is done by the Playwright microservice
 * that uses a stealth browser to extract public Instagram profiles.
 *
 * This module provides the HTTP client to call it.
 */

const PLAYWRIGHT_SERVICE_URL =
  process.env.PLAYWRIGHT_SERVICE_URL || "http://localhost:3001";
const PLAYWRIGHT_API_KEY =
  process.env.PLAYWRIGHT_SERVICE_API_KEY || "";

export interface InstagramProfile {
  username: string;
  fullName: string;
  bio: string | null;
  followers: number;
  following: number;
  posts: number;
  isPrivate: boolean;
  isBusiness: boolean;
  email: string | null;
  phone: string | null;
  website: string | null;
  category: string | null;
  profilePicUrl: string | null;
  profileUrl: string;
}

/**
 * Check if the Instagram scraping service (Playwright microservice) is running
 */
export async function checkInstagramService(): Promise<boolean> {
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
 * Scrape a single Instagram profile
 */
export async function scrapeInstagramProfile(
  username: string
): Promise<InstagramProfile | null> {
  try {
    const res = await fetch(`${PLAYWRIGHT_SERVICE_URL}/scrape/profile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": PLAYWRIGHT_API_KEY,
      },
      body: JSON.stringify({ username }),
      signal: AbortSignal.timeout(60000),
    });

    if (res.status === 404) return null;

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || `HTTP ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    console.error(`Instagram scrape error for ${username}:`, error);
    return null;
  }
}

/**
 * Search Instagram profiles by keyword
 */
export async function searchInstagramProfiles(
  query: string,
  limit: number = 20
): Promise<InstagramProfile[]> {
  try {
    const res = await fetch(`${PLAYWRIGHT_SERVICE_URL}/scrape/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": PLAYWRIGHT_API_KEY,
      },
      body: JSON.stringify({ query, limit }),
      signal: AbortSignal.timeout(180000), // 3 min — search + scrape each profile
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    return data.profiles || [];
  } catch (error) {
    console.error("Instagram search error:", error);
    return [];
  }
}

/**
 * Scrape multiple Instagram profiles
 */
export async function scrapeInstagramBulk(
  usernames: string[]
): Promise<InstagramProfile[]> {
  try {
    const res = await fetch(`${PLAYWRIGHT_SERVICE_URL}/scrape/bulk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": PLAYWRIGHT_API_KEY,
      },
      body: JSON.stringify({ usernames }),
      signal: AbortSignal.timeout(180000), // 3 min
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    return data.profiles || [];
  } catch (error) {
    console.error("Instagram bulk scrape error:", error);
    return [];
  }
}
