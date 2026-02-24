import type { Page, BrowserContext, Browser } from "playwright";
import { launchStealthBrowser } from "../browser/launcher.js";
import { browserPool } from "../browser/pool.js";
import { humanDelay, mediumDelay, shortDelay } from "../shared/delays.js";
import { GOOGLE_MAPS_SELECTORS as S } from "../shared/selectors.js";
import { extractEmailsFromWebsite } from "./email-extractor.js";

export interface GoogleMapsResult {
  businessName: string;
  category: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  rating: number | null;
  reviewsCount: number | null;
  profileUrl: string | null;
}

export interface ScrapeGoogleMapsOptions {
  query: string;
  location?: string;
  maxResults?: number;
  extractEmails?: boolean;
}

/**
 * Scrape Google Maps for business leads (pure scraping — no DB, no jobs)
 */
export async function scrapeGoogleMaps(
  options: ScrapeGoogleMapsOptions
): Promise<GoogleMapsResult[]> {
  const {
    query,
    location,
    maxResults = 20,
    extractEmails = true,
  } = options;

  await browserPool.acquire();

  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  const results: GoogleMapsResult[] = [];

  try {
    console.log(`[google-maps] Starting scrape: "${query}" in "${location || "any"}" (max: ${maxResults})`);

    // Launch browser
    const stealth = await launchStealthBrowser();
    browser = stealth.browser;
    context = stealth.context;
    const page = await context.newPage();

    // Navigate to Google Maps
    console.log("[google-maps] Navigating to Google Maps...");
    await page.goto("https://www.google.com/maps", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await shortDelay();

    // Accept cookies if present
    try {
      const acceptButton = page.locator('button:has-text("Accept all")');
      if (await acceptButton.isVisible({ timeout: 3000 })) {
        await acceptButton.click();
        await shortDelay();
      }
    } catch {
      // No cookie banner
    }

    // Compose search query
    const searchQuery = location ? `${query} en ${location}` : query;
    console.log(`[google-maps] Searching: "${searchQuery}"`);

    // Type search query
    const searchBox = page.locator(S.searchBox);
    await searchBox.click();
    await humanDelay(300, 700);
    await searchBox.fill(searchQuery);
    await humanDelay(500, 1000);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(3000);

    // Wait for results to load
    try {
      await page.waitForSelector(S.feedContainer, { timeout: 10000 });
    } catch {
      await page.waitForTimeout(3000);
    }

    console.log("[google-maps] Scrolling to load results...");

    // Scroll to load more results
    const feed = page.locator(S.feedContainer);
    let previousCount = 0;
    let sameCountRetries = 0;
    const maxScrollAttempts = Math.ceil(maxResults / 5) + 10;

    for (let scrollAttempt = 0; scrollAttempt < maxScrollAttempts; scrollAttempt++) {
      const currentItems = await page.locator(S.resultItem).count();

      if (currentItems >= maxResults) break;

      if (currentItems === previousCount) {
        sameCountRetries++;
        if (sameCountRetries >= 3) {
          const endOfList = await page.locator(S.endOfList).textContent().catch(() => null);
          if (endOfList?.includes("end of") || endOfList?.includes("fin")) break;
          if (sameCountRetries >= 5) break;
        }
      } else {
        sameCountRetries = 0;
      }

      previousCount = currentItems;

      // Scroll the feed container
      await feed.evaluate((el) => {
        (el as unknown as { scrollTop: number; scrollHeight: number }).scrollTop =
          (el as unknown as { scrollHeight: number }).scrollHeight;
      });

      console.log(`[google-maps] Loaded ${currentItems} results so far...`);
      await mediumDelay();
    }

    // Get all result links
    const resultLinks = await page.locator(S.resultItem).all();
    const totalToProcess = Math.min(resultLinks.length, maxResults);

    console.log(`[google-maps] Processing ${totalToProcess} results...`);

    // Click each result to get details
    for (let i = 0; i < totalToProcess; i++) {
      try {
        console.log(`[google-maps] Extracting ${i + 1}/${totalToProcess}...`);

        // Re-query the links each time (DOM may have changed)
        const currentLinks = await page.locator(S.resultItem).all();
        if (i >= currentLinks.length) break;

        // Click on the result
        await currentLinks[i].click();
        await humanDelay(2000, 4000);

        // Extract data from detail panel
        const data = await extractBusinessDetails(page);

        if (data.businessName) {
          // Extract profileUrl from current URL
          data.profileUrl = page.url();

          // Extract email from website if enabled
          if (extractEmails && data.website) {
            console.log(`[google-maps] Extracting email from ${data.website}...`);
            try {
              const emails = await extractEmailsFromWebsite(data.website);
              data.email = emails[0] || null;
            } catch {
              // Email extraction failed, skip
            }
          }

          results.push(data);
        }

        // Go back to results list
        await page.keyboard.press("Escape");
        await shortDelay();
      } catch (err) {
        console.error(`[google-maps] Error processing result ${i + 1}:`, err);
        continue;
      }
    }

    console.log(`[google-maps] Done! ${results.length} leads found.`);
    return results;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[google-maps] Scrape error:", errorMsg);
    throw error;
  } finally {
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
    browserPool.release();
  }
}

/**
 * Extract business details from the currently open Google Maps detail panel
 */
async function extractBusinessDetails(page: Page): Promise<GoogleMapsResult> {
  const result: GoogleMapsResult = {
    businessName: "",
    category: null,
    address: null,
    city: null,
    phone: null,
    website: null,
    email: null,
    rating: null,
    reviewsCount: null,
    profileUrl: null,
  };

  try {
    // Business name
    result.businessName = await page
      .locator(S.businessName)
      .textContent({ timeout: 5000 })
      .then((t) => t?.trim() || "")
      .catch(() => "");

    if (!result.businessName) {
      result.businessName = await page
        .locator(S.businessNameAlt)
        .textContent({ timeout: 2000 })
        .then((t) => t?.trim() || "")
        .catch(() => "");
    }

    // Category
    result.category = await page
      .locator(S.category)
      .first()
      .textContent({ timeout: 2000 })
      .then((t) => t?.trim() || null)
      .catch(() => null);

    if (!result.category) {
      result.category = await page
        .locator(S.categoryAlt)
        .first()
        .textContent({ timeout: 1000 })
        .then((t) => t?.trim() || null)
        .catch(() => null);
    }

    // Rating
    const ratingText = await page
      .locator(S.ratingValue)
      .first()
      .textContent({ timeout: 2000 })
      .catch(() => null);
    if (ratingText) {
      const parsed = parseFloat(ratingText.replace(",", "."));
      if (!isNaN(parsed)) result.rating = parsed;
    }

    // Review count
    const reviewText = await page
      .locator(S.reviewCount)
      .first()
      .getAttribute("aria-label", { timeout: 2000 })
      .catch(() => null);
    if (reviewText) {
      const match = reviewText.match(/[\d,.]+/);
      if (match) {
        result.reviewsCount = parseInt(match[0].replace(/[.,]/g, ""), 10);
      }
    }

    // Address
    result.address = await page
      .locator(S.address)
      .getAttribute("aria-label", { timeout: 2000 })
      .then((t) => t?.replace("Address: ", "").replace("Dirección: ", "").trim() || null)
      .catch(() => null);

    // Extract city from address
    if (result.address) {
      const parts = result.address.split(",");
      if (parts.length >= 2) {
        result.city = parts[parts.length - 2]?.trim() || null;
      }
    }

    // Phone
    result.phone = await page
      .locator(S.phone)
      .getAttribute("aria-label", { timeout: 2000 })
      .then((t) => {
        if (!t) return null;
        const cleaned = t.replace("Phone: ", "").replace("Teléfono: ", "").trim();
        return cleaned || null;
      })
      .catch(() => null);

    if (!result.phone) {
      result.phone = await page
        .locator(S.phoneAlt)
        .getAttribute("aria-label", { timeout: 1000 })
        .then((t) => t?.trim() || null)
        .catch(() => null);
    }

    // Website
    result.website = await page
      .locator(S.website)
      .getAttribute("href", { timeout: 2000 })
      .then((href) => href || null)
      .catch(() => null);

    if (!result.website) {
      result.website = await page
        .locator(S.websiteAlt)
        .getAttribute("href", { timeout: 1000 })
        .then((href) => href || null)
        .catch(() => null);
    }
  } catch (err) {
    console.error("[google-maps] Error extracting details:", err);
  }

  return result;
}
