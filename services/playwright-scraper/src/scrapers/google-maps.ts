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

// ─── Consent / Cookie Banner Dismissal ───────────────────────────────────────

async function dismissConsent(page: Page): Promise<void> {
  // Strategy 1: Direct consent buttons (multi-language)
  const consentSelectors = [
    'button[aria-label="Accept all"]',
    'button[aria-label="Aceptar todo"]',
    'button[aria-label="Tout accepter"]',
    'button[aria-label="Alle akzeptieren"]',
    'form[action*="consent"] button:first-of-type',
    'button:has-text("Accept all")',
    'button:has-text("Aceptar todo")',
    'button:has-text("I agree")',
    'button:has-text("Acepto")',
  ];

  for (const selector of consentSelectors) {
    try {
      const btn = page.locator(selector).first();
      if (await btn.isVisible({ timeout: 1500 }).catch(() => false)) {
        await btn.click();
        console.log(`[google-maps] Dismissed consent via: ${selector}`);
        await page.waitForTimeout(1500);
        return;
      }
    } catch {
      // Try next selector
    }
  }

  // Strategy 2: Consent inside iframe (Google sometimes uses an iframe)
  try {
    const iframe = page.frameLocator('iframe[src*="consent"]');
    const acceptSelectors = [
      'button:has-text("Accept")',
      'button:has-text("Aceptar")',
      'button:has-text("I agree")',
      'button[aria-label="Accept all"]',
    ];
    for (const sel of acceptSelectors) {
      const acceptBtn = iframe.locator(sel).first();
      if (await acceptBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
        await acceptBtn.click();
        console.log(`[google-maps] Dismissed consent via iframe: ${sel}`);
        await page.waitForTimeout(1500);
        return;
      }
    }
  } catch {
    // No iframe consent — that's fine
  }

  console.log("[google-maps] No consent banner detected (or already dismissed).");
}

// ─── Block / CAPTCHA Detection ───────────────────────────────────────────────

async function checkForBlock(page: Page): Promise<string | null> {
  try {
    const bodyText = await page.textContent("body", { timeout: 3000 }).catch(() => "");
    if (!bodyText) return null;

    const lower = bodyText.toLowerCase();
    if (lower.includes("unusual traffic") || lower.includes("tráfico inusual")) {
      return "Google detectó tráfico inusual (bot detection). Intenta de nuevo en unos minutos.";
    }
    if (lower.includes("captcha") || lower.includes("recaptcha")) {
      return "Google mostró un CAPTCHA. Intenta de nuevo más tarde.";
    }
    if (lower.includes("sorry, you have been blocked")) {
      return "Google bloqueó la solicitud. Intenta de nuevo más tarde.";
    }
    if (lower.includes("before you continue") && lower.includes("consent")) {
      // There's a consent page we couldn't dismiss
      return "Google muestra una página de consentimiento que no se pudo aceptar automáticamente.";
    }
  } catch {
    // Ignore errors in detection
  }
  return null;
}

// ─── Find Results Feed (with fallbacks) ──────────────────────────────────────

type FeedMode = "feed" | "links" | "none";

interface FeedResult {
  mode: FeedMode;
  count: number;
}

async function findResultsFeed(page: Page): Promise<FeedResult> {
  // Strategy 1: Standard div[role="feed"]
  try {
    await page.waitForSelector(S.feedContainer, { timeout: 12000 });
    const count = await page.locator(S.resultItem).count();
    if (count > 0) {
      console.log(`[google-maps] Found results via feed container (${count} items)`);
      return { mode: "feed", count };
    }
  } catch {
    console.log("[google-maps] div[role='feed'] not found, trying fallbacks...");
  }

  // Strategy 2: a.hfpxzc links (direct place links — most stable)
  try {
    await page.waitForSelector(S.resultItemByLink, { timeout: 8000 });
    const count = await page.locator(S.resultItemByLink).count();
    if (count > 0) {
      console.log(`[google-maps] Found results via a.hfpxzc links (${count} items)`);
      return { mode: "links", count };
    }
  } catch {
    console.log("[google-maps] a.hfpxzc links not found either.");
  }

  // Strategy 3: Alternative feed container
  try {
    await page.waitForSelector(S.feedContainerAlt, { timeout: 5000 });
    const count = await page.locator(`${S.feedContainerAlt} a`).count();
    if (count > 0) {
      console.log(`[google-maps] Found results via alt feed container (${count} items)`);
      return { mode: "links", count };
    }
  } catch {
    // No alt feed either
  }

  return { mode: "none", count: 0 };
}

// ─── Main Scrape Function ────────────────────────────────────────────────────

/**
 * Scrape Google Maps for business leads (pure scraping — no DB, no jobs)
 */
export async function scrapeGoogleMaps(
  options: ScrapeGoogleMapsOptions
): Promise<GoogleMapsResult[]> {
  const {
    query,
    location,
    maxResults = 10,
    extractEmails = false,
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

    // Compose search query and navigate directly to search URL
    const searchQuery = location ? `${query} en ${location}` : query;
    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}/`;
    console.log(`[google-maps] Navigating to: ${searchUrl}`);

    await page.goto(searchUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await shortDelay();

    // ── Step 1: Dismiss consent banners ──
    await dismissConsent(page);

    // ── Step 2: Check for blocks / CAPTCHA ──
    const blockMessage = await checkForBlock(page);
    if (blockMessage) {
      console.error(`[google-maps] BLOCKED: ${blockMessage}`);
      throw new Error(blockMessage);
    }

    // Log current page state for debugging
    console.log(`[google-maps] Page URL: ${page.url()}`);
    console.log(`[google-maps] Page title: ${await page.title()}`);

    // Wait for initial page rendering
    await page.waitForTimeout(2000);

    // ── Step 3: Find results feed (with fallbacks) ──
    const feedResult = await findResultsFeed(page);

    if (feedResult.mode === "none") {
      // Last resort: check if Google redirected to a single business detail
      const hasBusinessName = await page
        .locator(S.businessName)
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      if (hasBusinessName) {
        // Google showed a single result directly
        console.log("[google-maps] Single result detected — extracting details...");
        const data = await extractBusinessDetails(page);
        if (data.businessName) {
          data.profileUrl = page.url();
          if (extractEmails && data.website) {
            try {
              const emails = await extractEmailsFromWebsite(data.website);
              data.email = emails[0] || null;
            } catch { /* skip */ }
          }
          results.push(data);
        }
        return results;
      }

      // Check for block again after waiting
      const blockMsg2 = await checkForBlock(page);
      if (blockMsg2) {
        throw new Error(blockMsg2);
      }

      throw new Error(
        "No se encontraron resultados. Google puede estar mostrando una vista diferente o bloqueando la solicitud."
      );
    }

    // ── Step 4: Scroll to load more results ──
    console.log("[google-maps] Scrolling to load results...");

    if (feedResult.mode === "feed") {
      // Scroll the feed container
      const feed = page.locator(S.feedContainer);
      let previousCount = 0;
      let sameCountRetries = 0;
      const maxScrollAttempts = Math.ceil(maxResults / 5) + 8;

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

        // Scroll with explicit timeout to avoid the 30s default
        try {
          await feed.evaluate((el) => {
            (el as unknown as { scrollTop: number; scrollHeight: number }).scrollTop =
              (el as unknown as { scrollHeight: number }).scrollHeight;
          });
        } catch (scrollErr) {
          console.warn("[google-maps] Scroll evaluation failed, trying JS fallback:", scrollErr);
          // Fallback: scroll via page.evaluate
          await page.evaluate(() => {
            const feedEl = document.querySelector('div[role="feed"]');
            if (feedEl) feedEl.scrollTop = feedEl.scrollHeight;
          }).catch(() => {});
        }

        console.log(`[google-maps] Loaded ${currentItems} results so far...`);
        await humanDelay(2000, 4000); // Reduced from mediumDelay (3-6s)
      }
    }
    // For "links" mode, results are already loaded — no scroll needed

    // ── Step 5: Get result links and process each ──
    const linkSelector = feedResult.mode === "feed" ? S.resultItem : S.resultItemByLink;
    const resultLinks = await page.locator(linkSelector).all();
    const totalToProcess = Math.min(resultLinks.length, maxResults);

    console.log(`[google-maps] Processing ${totalToProcess} results...`);

    for (let i = 0; i < totalToProcess; i++) {
      try {
        console.log(`[google-maps] Extracting ${i + 1}/${totalToProcess}...`);

        // Re-query links each time (DOM may change after navigation)
        const currentLinks = await page.locator(linkSelector).all();
        if (i >= currentLinks.length) break;

        // Click on the result
        await currentLinks[i].click();
        await humanDelay(2000, 3500);

        // Extract data from detail panel
        const data = await extractBusinessDetails(page);

        if (data.businessName) {
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
        // Try to recover by pressing Escape
        await page.keyboard.press("Escape").catch(() => {});
        await page.waitForTimeout(1000);
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

// ─── Extract Business Details ────────────────────────────────────────────────

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
