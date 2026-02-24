import type { Browser, BrowserContext } from "playwright";
import { launchStealthBrowser } from "./shared/stealth";
import { humanDelay, longDelay } from "./shared/delays";
import {
  updateJobProgress,
  updateJobStatus,
  setJobResult,
  setJobError,
  getJob,
} from "../jobs/manager";
import { prisma } from "../db";

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
  jobId: string;
  userId: string;
  searchId: string;
}

/**
 * Scrape LinkedIn profiles via Google search (site:linkedin.com/in/)
 * This avoids LinkedIn login requirements
 */
export async function scrapeLinkedIn(
  options: ScrapeLinkedInOptions
): Promise<LinkedInResult[]> {
  const {
    keyword,
    location,
    maxResults = 20,
    jobId,
    userId,
    searchId,
  } = options;

  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  const results: LinkedInResult[] = [];

  try {
    updateJobStatus(jobId, "running");
    updateJobProgress(jobId, {
      phase: "Iniciando navegador",
      current: 0,
      total: maxResults,
      message: "Lanzando Chromium para LinkedIn...",
    });

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
      // Check cancellation
      const job = getJob(jobId);
      if (job?.status === "cancelled") break;

      const start = pageNum * 10;
      const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&start=${start}`;

      updateJobProgress(jobId, {
        phase: "Buscando perfiles",
        message: `Página ${pageNum + 1} de Google...`,
      });

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

          updateJobProgress(jobId, {
            current: resultsCollected,
            message: `${parsed.contactPerson} - ${parsed.contactTitle || "Sin título"}`,
          });

          // Save to DB
          try {
            await prisma.lead.create({
              data: {
                userId,
                searchId,
                source: "linkedin",
                contactPerson: parsed.contactPerson,
                contactTitle: parsed.contactTitle,
                city: parsed.city || location || null,
                profileUrl: parsed.profileUrl,
                businessName: parsed.company,
              },
            });
          } catch {
            // Duplicate or DB error
          }
        } catch {
          continue;
        }
      }

      // Delay between Google pages
      if (pageNum < pagesNeeded - 1) {
        await longDelay();
      }
    }

    // Update search
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
      message: `¡${results.length} perfiles encontrados!`,
    });
    setJobResult(jobId, { count: results.length, results });

    return results;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    await prisma.search.update({
      where: { id: searchId },
      data: { status: "failed", errorMessage: errorMsg },
    }).catch(() => {});
    setJobError(jobId, errorMsg);
    return results;
  } finally {
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
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
