import type { Browser, BrowserContext } from "playwright";
import { launchStealthBrowser } from "../browser/launcher.js";
import { browserPool } from "../browser/pool.js";
import { humanDelay, longDelay } from "../shared/delays.js";

export interface LinkedInResult {
  contactPerson: string;
  contactTitle: string | null;
  company: string | null;
  city: string | null;
  profileUrl: string;
}

export interface ScrapeLinkedInOptions {
  keyword: string;
  location?: string;
  maxResults?: number;
}

/**
 * Scrape LinkedIn profiles via Google search (pure scraping — no DB, no jobs)
 */
export async function scrapeLinkedIn(
  options: ScrapeLinkedInOptions
): Promise<LinkedInResult[]> {
  const {
    keyword,
    location,
    maxResults = 20,
  } = options;

  await browserPool.acquire();

  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  const results: LinkedInResult[] = [];

  try {
    console.log(`[linkedin] Starting scrape: "${keyword}" in "${location || "any"}" (max: ${maxResults})`);

    const stealth = await launchStealthBrowser();
    browser = stealth.browser;
    context = stealth.context;
    const page = await context.newPage();

    // Build Google search query
    const searchQuery = location
      ? `site:linkedin.com/in/ "${keyword}" "${location}"`
      : `site:linkedin.com/in/ "${keyword}"`;

    const pagesNeeded = Math.ceil(maxResults / 10);
    let resultsCollected = 0;

    for (let pageNum = 0; pageNum < pagesNeeded && resultsCollected < maxResults; pageNum++) {
      const start = pageNum * 10;
      const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&start=${start}`;

      console.log(`[linkedin] Google page ${pageNum + 1}/${pagesNeeded}...`);

      await page.goto(googleUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
      await humanDelay(2000, 4000);

      // Accept cookies if present
      if (pageNum === 0) {
        try {
          const acceptBtn = page.locator('button:has-text("Accept all"), button:has-text("Aceptar todo")');
          if (await acceptBtn.isVisible({ timeout: 2000 })) {
            await acceptBtn.click();
            await humanDelay(1000, 2000);
          }
        } catch {
          // No cookie banner
        }
      }

      // Extract results from Google SERP
      const searchResults = await page.locator("div.g").all();

      for (const result of searchResults) {
        if (resultsCollected >= maxResults) break;

        try {
          const linkEl = result.locator("a").first();
          const href = await linkEl.getAttribute("href");
          if (!href || !href.includes("linkedin.com/in/")) continue;

          const titleEl = result.locator("h3").first();
          const title = await titleEl.textContent().catch(() => null);
          if (!title) continue;

          const snippetEl = result.locator("div[data-sncf]").first();
          const snippet = await snippetEl.textContent().catch(() => "");

          // Parse LinkedIn profile info from Google snippet
          const parsed = parseLinkedInSnippet(title, snippet || "", href);
          if (!parsed) continue;

          results.push(parsed);
          resultsCollected++;

          console.log(`[linkedin] ${resultsCollected}/${maxResults}: ${parsed.contactPerson} - ${parsed.contactTitle || "N/A"}`);
        } catch {
          continue;
        }
      }

      // Delay between Google pages
      if (pageNum < pagesNeeded - 1) {
        await longDelay();
      }
    }

    console.log(`[linkedin] Done! ${results.length} profiles found.`);
    return results;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[linkedin] Scrape error:", errorMsg);
    throw error;
  } finally {
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
    browserPool.release();
  }
}

/**
 * Parse LinkedIn profile info from Google search snippet
 */
function parseLinkedInSnippet(
  title: string,
  snippet: string,
  url: string
): LinkedInResult | null {
  // Title format: "Name - Title - Company | LinkedIn"
  const titleParts = title
    .replace(" | LinkedIn", "")
    .replace(" - LinkedIn", "")
    .split(" - ")
    .map((s) => s.trim())
    .filter(Boolean);

  if (titleParts.length === 0) return null;

  const contactPerson = titleParts[0];
  const contactTitle = titleParts.length > 1 ? titleParts[1] : null;
  const company = titleParts.length > 2 ? titleParts[2] : null;

  // Try to extract location from snippet
  let city: string | null = null;
  const locationMatch = snippet.match(
    /(?:ubicación|location|zona)\s*[:\-]?\s*([^·\n.]+)/i
  );
  if (locationMatch) {
    city = locationMatch[1].trim();
  }

  // Clean up profile URL
  const profileUrl = url.split("?")[0];

  return { contactPerson, contactTitle, company, city, profileUrl };
}
