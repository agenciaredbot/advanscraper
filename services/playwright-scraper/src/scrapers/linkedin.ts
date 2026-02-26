import type { Browser, BrowserContext } from "playwright";
import { launchStealthBrowser } from "../browser/launcher.js";
import { browserPool } from "../browser/pool.js";
import { humanDelay, longDelay } from "../shared/delays.js";

export interface LinkedInResult {
  contactPerson: string;
  firstName: string | null;
  lastName: string | null;
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

      await page.goto(googleUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      await humanDelay(2000, 4000);

      // Accept cookies if present
      if (pageNum === 0) {
        try {
          const consentSelectors = [
            'button:has-text("Accept all")',
            'button:has-text("Aceptar todo")',
            'button:has-text("I agree")',
            'button:has-text("Acepto")',
            'form[action*="consent"] button',
          ];
          for (const sel of consentSelectors) {
            const btn = page.locator(sel).first();
            if (await btn.isVisible({ timeout: 1500 }).catch(() => false)) {
              await btn.click();
              console.log(`[linkedin] Clicked consent: ${sel}`);
              await humanDelay(1000, 2000);
              break;
            }
          }
        } catch {
          // No cookie banner
        }
      }

      // Debug: log page URL and title
      console.log(`[linkedin] Page URL: ${page.url()}`);
      console.log(`[linkedin] Page title: ${await page.title()}`);

      // Extract results from Google SERP (try multiple selectors)
      let searchResults = await page.locator("div.g").all();
      console.log(`[linkedin] Found ${searchResults.length} results with div.g`);

      // Fallback: try broader selectors if div.g finds nothing
      if (searchResults.length === 0) {
        searchResults = await page.locator('#search .g, #rso > div').all();
        console.log(`[linkedin] Fallback found ${searchResults.length} results`);
      }

      // If still nothing, try extracting all links containing linkedin.com/in/
      if (searchResults.length === 0) {
        console.log("[linkedin] Using link-based extraction fallback...");
        const linkedinLinks = await page.locator('a[href*="linkedin.com/in/"]').all();
        console.log(`[linkedin] Found ${linkedinLinks.length} LinkedIn links directly`);

        for (const link of linkedinLinks) {
          if (resultsCollected >= maxResults) break;
          try {
            const href = await link.getAttribute("href");
            if (!href) continue;

            // Find the parent container to get title/snippet
            const parentText = await link.locator("..").textContent().catch(() => "");
            const title = await link.locator("h3").textContent().catch(() => null)
              || await link.textContent().catch(() => null);

            if (!title) continue;

            const parsed = parseLinkedInSnippet(title, parentText || "", href);
            if (!parsed) continue;

            results.push(parsed);
            resultsCollected++;
            console.log(`[linkedin] ${resultsCollected}/${maxResults}: ${parsed.contactPerson}`);
          } catch {
            continue;
          }
        }
        continue; // Skip the div.g loop below
      }

      for (const result of searchResults) {
        if (resultsCollected >= maxResults) break;

        try {
          const linkEl = result.locator("a").first();
          const href = await linkEl.getAttribute("href");
          if (!href || !href.includes("linkedin.com/in/")) continue;

          const titleEl = result.locator("h3").first();
          const title = await titleEl.textContent().catch(() => null);
          if (!title) continue;

          // Try multiple snippet selectors
          let snippet = "";
          const snippetSelectors = ["div[data-sncf]", "div.VwiC3b", "span.aCOpRe", "div[style*='line-clamp']"];
          for (const sel of snippetSelectors) {
            snippet = await result.locator(sel).first().textContent().catch(() => "") || "";
            if (snippet) break;
          }

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
  const nameParts = contactPerson.trim().split(/\s+/);
  const firstName = nameParts[0] || null;
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : null;
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

  return { contactPerson, firstName, lastName, contactTitle, company, city, profileUrl };
}
