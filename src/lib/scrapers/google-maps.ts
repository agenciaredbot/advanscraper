import type { Page, BrowserContext, Browser } from "playwright";
import { launchStealthBrowser } from "./shared/stealth";
import { humanDelay, mediumDelay, shortDelay } from "./shared/delays";
import { GOOGLE_MAPS_SELECTORS as S } from "./shared/selectors";
import { extractEmailsFromWebsite } from "./email-extractor";
import {
  updateJobProgress,
  updateJobStatus,
  setJobResult,
  setJobError,
  getJob,
} from "../jobs/manager";
import { prisma } from "../db";

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
  jobId: string;
  userId: string;
  searchId: string;
}

/**
 * Scrape Google Maps for business leads
 */
export async function scrapeGoogleMaps(
  options: ScrapeGoogleMapsOptions
): Promise<GoogleMapsResult[]> {
  const {
    query,
    location,
    maxResults = 20,
    extractEmails = true,
    jobId,
    userId,
    searchId,
  } = options;

  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  const results: GoogleMapsResult[] = [];

  try {
    updateJobStatus(jobId, "running");
    updateJobProgress(jobId, {
      phase: "Iniciando navegador",
      current: 0,
      total: maxResults,
      message: "Lanzando Chromium con stealth...",
    });

    // Launch browser
    const stealth = await launchStealthBrowser();
    browser = stealth.browser;
    context = stealth.context;
    const page = await context.newPage();

    // Navigate to Google Maps
    updateJobProgress(jobId, {
      phase: "Navegando a Google Maps",
      message: "Abriendo Google Maps...",
    });

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

    updateJobProgress(jobId, {
      phase: "Buscando",
      message: `Buscando: "${searchQuery}"...`,
    });

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
      // Try alternative: sometimes results load differently
      await page.waitForTimeout(3000);
    }

    updateJobProgress(jobId, {
      phase: "Scrolleando resultados",
      message: "Cargando más resultados...",
    });

    // Scroll to load more results
    const feed = page.locator(S.feedContainer);
    let previousCount = 0;
    let sameCountRetries = 0;
    const maxScrollAttempts = Math.ceil(maxResults / 5) + 10;

    for (let scrollAttempt = 0; scrollAttempt < maxScrollAttempts; scrollAttempt++) {
      // Check if job was cancelled
      const job = getJob(jobId);
      if (job?.status === "cancelled") {
        throw new Error("Job cancelled by user");
      }

      const currentItems = await page.locator(S.resultItem).count();

      if (currentItems >= maxResults) break;

      if (currentItems === previousCount) {
        sameCountRetries++;
        if (sameCountRetries >= 3) {
          // Check if we hit "end of list"
          const endOfList = await page.locator(S.endOfList).textContent().catch(() => null);
          if (endOfList?.includes("end of") || endOfList?.includes("fin")) break;
          if (sameCountRetries >= 5) break;
        }
      } else {
        sameCountRetries = 0;
      }

      previousCount = currentItems;

      // Scroll the feed container
      await feed.evaluate((el: Element) => {
        el.scrollTop = el.scrollHeight;
      });

      updateJobProgress(jobId, {
        message: `Cargando resultados... (${currentItems} encontrados)`,
      });

      await mediumDelay();
    }

    // Get all result links
    const resultLinks = await page.locator(S.resultItem).all();
    const totalToProcess = Math.min(resultLinks.length, maxResults);

    updateJobProgress(jobId, {
      phase: "Extrayendo datos",
      total: totalToProcess,
      message: `Procesando ${totalToProcess} resultados...`,
    });

    // Click each result to get details
    for (let i = 0; i < totalToProcess; i++) {
      // Check if job was cancelled
      const job = getJob(jobId);
      if (job?.status === "cancelled") {
        throw new Error("Job cancelled by user");
      }

      try {
        updateJobProgress(jobId, {
          current: i + 1,
          message: `Procesando resultado ${i + 1} de ${totalToProcess}...`,
        });

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
            updateJobProgress(jobId, {
              message: `Extrayendo email de ${data.website}...`,
            });
            try {
              const emails = await extractEmailsFromWebsite(data.website);
              data.email = emails[0] || null;
            } catch {
              // Email extraction failed, skip
            }
          }

          results.push(data);

          // Save to DB immediately
          try {
            await prisma.lead.create({
              data: {
                userId,
                searchId,
                source: "google_maps",
                businessName: data.businessName,
                category: data.category,
                address: data.address,
                city: data.city || location || null,
                phone: data.phone,
                website: data.website,
                email: data.email,
                rating: data.rating,
                reviewsCount: data.reviewsCount,
                profileUrl: data.profileUrl,
              },
            });
          } catch (dbError) {
            // Duplicate or DB error, log but continue
            console.error("DB insert error:", dbError);
          }
        }

        // Go back to results list
        await page.keyboard.press("Escape");
        await shortDelay();
      } catch (err) {
        console.error(`Error processing result ${i + 1}:`, err);
        continue;
      }
    }

    // Update search with results count
    await prisma.search.update({
      where: { id: searchId },
      data: {
        status: "completed",
        totalResults: results.length,
        completedAt: new Date(),
      },
    });

    updateJobStatus(jobId, "completed");
    updateJobProgress(jobId, {
      phase: "Completado",
      current: results.length,
      total: totalToProcess,
      message: `¡Listo! ${results.length} leads encontrados.`,
    });
    setJobResult(jobId, { count: results.length, results });

    return results;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Google Maps scrape error:", errorMsg);

    // Update search status
    await prisma.search.update({
      where: { id: searchId },
      data: {
        status: "failed",
        errorMessage: errorMsg,
      },
    }).catch(() => {});

    setJobError(jobId, errorMsg);
    return results;
  } finally {
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
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
    console.error("Error extracting details:", err);
  }

  return result;
}
