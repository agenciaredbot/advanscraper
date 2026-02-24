/**
 * Instagram Scraper — Client for Python microservice
 *
 * The actual scraping is done by a Flask microservice running on port 5000
 * that uses Instaloader for data extraction.
 *
 * This module provides the Node.js API client.
 */

const INSTAGRAM_SERVICE_URL =
  process.env.INSTAGRAM_SERVICE_URL || "http://localhost:5000";

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
 * Check if the Instagram microservice is running
 */
export async function checkInstagramService(): Promise<boolean> {
  try {
    const res = await fetch(`${INSTAGRAM_SERVICE_URL}/health`, {
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
    const res = await fetch(`${INSTAGRAM_SERVICE_URL}/scrape/profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
      signal: AbortSignal.timeout(30000),
    });

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
    const res = await fetch(`${INSTAGRAM_SERVICE_URL}/scrape/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit }),
      signal: AbortSignal.timeout(60000),
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
    const res = await fetch(`${INSTAGRAM_SERVICE_URL}/scrape/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usernames }),
      signal: AbortSignal.timeout(120000),
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
