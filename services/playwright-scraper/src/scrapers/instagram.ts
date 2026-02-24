import type { Browser, BrowserContext, Page } from "playwright";
import { launchStealthBrowser } from "../browser/launcher.js";
import { browserPool } from "../browser/pool.js";
import { humanDelay, shortDelay } from "../shared/delays.js";

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
 * Scrape a single public Instagram profile using Playwright
 */
export async function scrapeInstagramProfile(
  username: string
): Promise<InstagramProfile | null> {
  await browserPool.acquire();

  let browser: Browser | null = null;
  let context: BrowserContext | null = null;

  try {
    console.log(`[instagram] Scraping profile: @${username}`);

    const stealth = await launchStealthBrowser();
    browser = stealth.browser;
    context = stealth.context;
    const page = await context.newPage();

    const profile = await extractProfileFromPage(page, username);
    return profile;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[instagram] Error scraping @${username}:`, errorMsg);
    throw error;
  } finally {
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
    browserPool.release();
  }
}

/**
 * Search Instagram profiles by keyword via Google
 * (Instagram search requires login, so we use Google site:instagram.com)
 */
export async function searchInstagramProfiles(
  query: string,
  limit: number = 20
): Promise<InstagramProfile[]> {
  await browserPool.acquire();

  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  const profiles: InstagramProfile[] = [];

  try {
    console.log(`[instagram] Searching: "${query}" (max: ${limit})`);

    const stealth = await launchStealthBrowser();
    browser = stealth.browser;
    context = stealth.context;
    const page = await context.newPage();

    // Use Google to find Instagram profiles
    const searchQuery = `site:instagram.com "${query}"`;
    const pagesNeeded = Math.ceil(limit / 10);
    const usernames = new Set<string>();

    for (let pageNum = 0; pageNum < pagesNeeded && usernames.size < limit; pageNum++) {
      const start = pageNum * 10;
      const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&start=${start}`;

      console.log(`[instagram] Google page ${pageNum + 1}/${pagesNeeded}...`);

      await page.goto(googleUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      await humanDelay(2000, 4000);

      // Accept cookies on first page
      if (pageNum === 0) {
        try {
          const consentSelectors = [
            'button:has-text("Accept all")',
            'button:has-text("Aceptar todo")',
            'button:has-text("I agree")',
          ];
          for (const sel of consentSelectors) {
            const btn = page.locator(sel).first();
            if (await btn.isVisible({ timeout: 1500 }).catch(() => false)) {
              await btn.click();
              await shortDelay();
              break;
            }
          }
        } catch {
          // No consent
        }
      }

      // Extract Instagram profile URLs from Google results
      const links = await page.locator('a[href*="instagram.com/"]').all();

      for (const link of links) {
        if (usernames.size >= limit) break;
        try {
          const href = await link.getAttribute("href");
          if (!href) continue;

          // Extract username from Instagram URL
          const match = href.match(/instagram\.com\/([a-zA-Z0-9._]{1,30})\/?(?:\?|$)/);
          if (!match) continue;

          const user = match[1].toLowerCase();
          // Skip non-profile pages
          if (["explore", "reel", "reels", "p", "stories", "accounts", "directory", "about", "legal", "developer"].includes(user)) continue;

          usernames.add(user);
        } catch {
          continue;
        }
      }

      if (pageNum < pagesNeeded - 1) {
        await humanDelay(3000, 5000);
      }
    }

    console.log(`[instagram] Found ${usernames.size} usernames, scraping profiles...`);

    // Now scrape each profile
    let scraped = 0;
    for (const user of usernames) {
      try {
        scraped++;
        console.log(`[instagram] Scraping ${scraped}/${usernames.size}: @${user}`);

        const profile = await extractProfileFromPage(page, user);
        if (profile) {
          profiles.push(profile);
        }

        // Rate limiting between profiles
        await humanDelay(3000, 6000);
      } catch (err) {
        console.error(`[instagram] Failed to scrape @${user}:`, err);
        continue;
      }
    }

    console.log(`[instagram] Search done! ${profiles.length} profiles extracted.`);
    return profiles;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[instagram] Search error:", errorMsg);
    throw error;
  } finally {
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
    browserPool.release();
  }
}

/**
 * Scrape multiple Instagram profiles by username
 */
export async function scrapeInstagramBulk(
  usernames: string[]
): Promise<InstagramProfile[]> {
  await browserPool.acquire();

  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  const profiles: InstagramProfile[] = [];

  try {
    console.log(`[instagram] Bulk scraping ${usernames.length} profiles...`);

    const stealth = await launchStealthBrowser();
    browser = stealth.browser;
    context = stealth.context;
    const page = await context.newPage();

    for (let i = 0; i < usernames.length; i++) {
      const user = usernames[i].replace("@", "").trim();
      if (!user) continue;

      try {
        console.log(`[instagram] Bulk ${i + 1}/${usernames.length}: @${user}`);

        const profile = await extractProfileFromPage(page, user);
        if (profile) {
          profiles.push(profile);
        }

        // Rate limiting between profiles
        if (i < usernames.length - 1) {
          await humanDelay(3000, 6000);
        }
      } catch (err) {
        console.error(`[instagram] Failed @${user}:`, err);
        continue;
      }
    }

    console.log(`[instagram] Bulk done! ${profiles.length}/${usernames.length} profiles extracted.`);
    return profiles;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[instagram] Bulk error:", errorMsg);
    throw error;
  } finally {
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
    browserPool.release();
  }
}

/**
 * Extract profile data from an Instagram profile page
 */
async function extractProfileFromPage(
  page: Page,
  username: string
): Promise<InstagramProfile | null> {
  const profileUrl = `https://www.instagram.com/${username}/`;

  await page.goto(profileUrl, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await humanDelay(2000, 4000);

  // Check for login wall / consent
  try {
    // Instagram sometimes shows a login prompt overlay — try to dismiss it
    const dismissBtn = page.locator('button:has-text("Not Now"), button:has-text("Ahora no")').first();
    if (await dismissBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await dismissBtn.click();
      await shortDelay();
    }
  } catch {
    // No dismiss needed
  }

  // Check if page loaded properly
  const pageTitle = await page.title();
  console.log(`[instagram] Page title for @${username}: "${pageTitle}"`);

  // Check for "Page Not Found" or login redirect
  if (
    pageTitle.includes("Page Not Found") ||
    pageTitle.includes("Página no encontrada") ||
    page.url().includes("/accounts/login")
  ) {
    console.log(`[instagram] Profile @${username} not found or requires login`);
    return null;
  }

  // Try to extract data from the page using multiple strategies
  const profile = await page.evaluate((user: string) => {
    const result = {
      username: user,
      fullName: "",
      bio: null as string | null,
      followers: 0,
      following: 0,
      posts: 0,
      isPrivate: false,
      isBusiness: false,
      email: null as string | null,
      phone: null as string | null,
      website: null as string | null,
      category: null as string | null,
      profilePicUrl: null as string | null,
      profileUrl: `https://www.instagram.com/${user}/`,
    };

    // Strategy 1: Parse meta tags (most reliable for basic info)
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      const content = metaDesc.getAttribute("content") || "";
      // Format: "123 Followers, 456 Following, 789 Posts - See Instagram photos and videos from Name (@user)"
      // Or: "123 seguidores, 456 seguidos, 789 publicaciones..."
      const followersMatch = content.match(/([\d,.KkMm]+)\s*(?:Followers|seguidores)/i);
      const followingMatch = content.match(/([\d,.KkMm]+)\s*(?:Following|seguidos)/i);
      const postsMatch = content.match(/([\d,.KkMm]+)\s*(?:Posts|publicaciones)/i);
      const nameMatch = content.match(/from\s+(.+?)\s*\(@/);

      if (followersMatch) result.followers = parseCount(followersMatch[1]);
      if (followingMatch) result.following = parseCount(followingMatch[1]);
      if (postsMatch) result.posts = parseCount(postsMatch[1]);
      if (nameMatch) result.fullName = nameMatch[1].trim();
    }

    // Strategy 2: Parse from OG title
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle && !result.fullName) {
      const titleContent = ogTitle.getAttribute("content") || "";
      // Format: "Name (@username) • Instagram photos and videos"
      const titleNameMatch = titleContent.match(/^(.+?)\s*\(@/);
      if (titleNameMatch) result.fullName = titleNameMatch[1].trim();
    }

    // Strategy 3: Parse from page title
    if (!result.fullName) {
      const title = document.title;
      const titleNameMatch = title.match(/^(.+?)\s*\(@/);
      if (titleNameMatch) result.fullName = titleNameMatch[1].trim();
    }

    // Strategy 4: Extract from rendered DOM
    // Bio
    const bioSelectors = [
      'div[class*="biography"] span',
      'section main header section > div:nth-child(3) span',
      'span[class*="notranslate"]',
    ];
    for (const sel of bioSelectors) {
      const el = document.querySelector(sel);
      if (el && el.textContent && el.textContent.trim().length > 5) {
        result.bio = el.textContent.trim();
        break;
      }
    }

    // Website link
    const websiteLink = document.querySelector('a[rel*="nofollow"][href*="l.instagram.com"]') ||
      document.querySelector('a[class*="link"][target="_blank"]');
    if (websiteLink) {
      const href = websiteLink.getAttribute("href") || "";
      // Instagram redirects through l.instagram.com — try to get the display text instead
      result.website = websiteLink.textContent?.trim() || href;
      if (result.website && !result.website.startsWith("http")) {
        result.website = "https://" + result.website;
      }
    }

    // Profile pic
    const profileImg = document.querySelector('header img[alt*="profile"], header img[alt*="foto"]') ||
      document.querySelector('img[data-testid="user-avatar"]');
    if (profileImg) {
      result.profilePicUrl = profileImg.getAttribute("src") || null;
    }

    // Category (business accounts)
    const categoryEl = document.querySelector('div[class*="category"]') ||
      document.querySelector('header a[href*="category"]');
    if (categoryEl && categoryEl.textContent) {
      result.category = categoryEl.textContent.trim();
      result.isBusiness = true;
    }

    // Private account check
    const privateText = document.body.innerText;
    if (privateText.includes("This account is private") || privateText.includes("Esta cuenta es privada")) {
      result.isPrivate = true;
    }

    // Extract email from bio
    if (result.bio) {
      const emailMatch = result.bio.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
      if (emailMatch) result.email = emailMatch[0];
    }

    // Extract phone from bio
    if (result.bio) {
      const phoneMatch = result.bio.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/);
      if (phoneMatch) result.phone = phoneMatch[0];
    }

    // Fallback: if no name found, use username
    if (!result.fullName) result.fullName = user;

    return result;

    // Helper to parse "1,234" or "1.2K" or "1.5M" into numbers
    function parseCount(str: string): number {
      const cleaned = str.replace(/,/g, "").trim().toUpperCase();
      if (cleaned.endsWith("K")) return Math.round(parseFloat(cleaned) * 1000);
      if (cleaned.endsWith("M")) return Math.round(parseFloat(cleaned) * 1000000);
      return parseInt(cleaned, 10) || 0;
    }
  }, username);

  if (!profile || (!profile.fullName && profile.followers === 0)) {
    console.log(`[instagram] Could not extract data for @${username}`);
    return null;
  }

  console.log(`[instagram] ✅ @${username}: ${profile.fullName} (${profile.followers} followers)`);
  return profile;
}
