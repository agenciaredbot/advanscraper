/**
 * Apify API integration for lead scraping
 *
 * Actors used (verified against documentation Feb 2026):
 *
 * SCRAPING:
 * - Google Maps:  compass/crawler-google-places     (scrapeContacts: true for emails)
 * - LinkedIn:     harvestapi/linkedin-profile-search (NO cookies, built-in email search)
 * - Instagram:    apify/instagram-profile-scraper    (specific usernames)
 *                 apify/instagram-scraper            (keyword search)
 * - Facebook:     apify/facebook-search-scraper      (keyword + location search)
 *                 apify/facebook-pages-scraper       (specific page URLs)
 *
 * ENRICHMENT:
 * - LinkedIn→Email:  anchor/linkedin-to-email       (backup: $9/1K lookups)
 * - Website→Email:   anchor/email-phone-extractor   (maxDepth:2, sameDomain:true)
 */

import { ApifyClient } from "apify-client";
import { resolveApiKey, SYSTEM_KEY_NAMES } from "@/lib/api-keys";

// Get API token: user key → system DB → env var
async function getApifyClient(apiToken?: string): Promise<ApifyClient> {
  const token = await resolveApiKey(SYSTEM_KEY_NAMES.APIFY_API_TOKEN, apiToken);
  if (!token) throw new Error("Apify API token no configurado");
  return new ApifyClient({ token });
}

// ====================================
// Google Maps via Apify
// Actor: compass/crawler-google-places
// Docs: https://apify.com/compass/crawler-google-places
// ====================================

interface ApifyGoogleMapsInput {
  searchStringsArray: string[];
  locationQuery?: string;
  maxCrawledPlacesPerSearch?: number;
  language?: string;
  includeWebResults?: boolean;
  scrapeContacts?: boolean; // Extracts emails from business websites ($1-2/1K places)
}

interface ApifyGoogleMapsResult {
  title: string;
  categoryName: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  website: string | null;
  totalScore: number | null;
  reviewsCount: number | null;
  url: string | null;
  emails?: string[];
}

export async function scrapeGoogleMapsApify(
  query: string,
  location: string | undefined,
  limit: number = 50,
  apiToken?: string
): Promise<ApifyGoogleMapsResult[]> {
  const client = await getApifyClient(apiToken);

  const input: ApifyGoogleMapsInput = {
    searchStringsArray: [location ? `${query} en ${location}` : query],
    maxCrawledPlacesPerSearch: limit,
    language: "es",
    includeWebResults: false,
    // NOTE: scrapeContacts REMOVED — it makes the actor visit each business website
    // which takes 2-5 minutes and exceeds the 60s Vercel limit.
    // Email enrichment is handled separately via enrichEmailsFromWebsites() in the route.
  };

  if (location) {
    input.locationQuery = location;
  }

  // Run the Google Maps Scraper actor (fast without scrapeContacts: ~15-25s)
  const run = await client
    .actor("compass/crawler-google-places")
    .call(input, { waitSecs: 45 });

  // Fetch results
  const { items } = await client.dataset(run.defaultDatasetId).listItems();

  return items.map((item: Record<string, unknown>) => ({
    title: (item.title as string) || "",
    categoryName: (item.categoryName as string) || null,
    address: (item.address as string) || null,
    city: (item.city as string) || null,
    phone: (item.phone as string) || null,
    website: (item.website as string) || null,
    totalScore: (item.totalScore as number) || null,
    reviewsCount: (item.reviewsCount as number) || null,
    url: (item.url as string) || null,
    emails: (item.emails as string[]) || [],
  }));
}

// ====================================
// LinkedIn via Apify (NO COOKIES NEEDED)
// Actor: harvestapi/linkedin-profile-search
// Docs: https://apify.com/harvestapi/linkedin-profile-search
// Features:
//   - Search by keyword + location filters
//   - "Full + email search" mode includes SMTP-validated email lookup
//   - No LinkedIn cookies or account required
//   - 8,135+ users, 620K+ runs
// ====================================

interface ApifyLinkedInResult {
  fullName: string;
  headline: string | null;
  company: string | null;
  location: string | null;
  profileUrl: string;
  email: string | null;
}

export async function scrapeLinkedInApify(
  keyword: string,
  location: string | undefined,
  limit: number = 50,
  apiToken?: string
): Promise<ApifyLinkedInResult[]> {
  const client = await getApifyClient(apiToken);

  // harvestapi/linkedin-profile-search input
  // profileScraperMode: "Full + email search" → $0.01/profile (includes email lookup)
  const actorInput: Record<string, unknown> = {
    searchQuery: keyword,
    profileScraperMode: "Full + email search",
    maxItems: limit,
  };

  if (location) {
    actorInput.locations = [location];
  }

  const run = await client
    .actor("harvestapi/linkedin-profile-search")
    .call(actorInput, { waitSecs: 55 });

  const { items } = await client.dataset(run.defaultDatasetId).listItems();

  return items.map((item: Record<string, unknown>) => {
    // Map the harvestapi output to our interface
    const firstName = (item.firstName as string) || "";
    const lastName = (item.lastName as string) || "";
    const fullName = `${firstName} ${lastName}`.trim();

    // Extract company from currentPosition array
    const currentPosition = item.currentPosition as Array<Record<string, unknown>> | undefined;
    const company = (currentPosition?.[0]?.companyName as string) || null;

    // Extract location text
    const loc = item.location as Record<string, unknown> | undefined;
    const locationText = (loc?.linkedinText as string) || null;

    // Extract email (the actor uses "Full + email search" mode)
    const email =
      (item.email as string) ||
      (item.emailAddress as string) ||
      (item.workEmail as string) ||
      null;

    return {
      fullName: fullName || (item.fullName as string) || "",
      headline: (item.headline as string) || (item.occupation as string) || null,
      company,
      location: locationText,
      profileUrl: (item.linkedinUrl as string) || (item.profileUrl as string) || "",
      email: email && email.includes("@") ? email : null,
    };
  });
}

/**
 * Backup enrichment: Find emails for LinkedIn profiles using anchor/linkedin-to-email.
 * Cost: $9/1,000 lookups. Only use as fallback when the main actor didn't find emails.
 * Docs: https://apify.com/anchor/linkedin-to-email
 */
export async function enrichLinkedInEmails(
  profileUrls: string[],
  apiToken?: string
): Promise<Map<string, string>> {
  const emailMap = new Map<string, string>();
  if (profileUrls.length === 0) return emailMap;

  try {
    const client = await getApifyClient(apiToken);

    const run = await client
      .actor("anchor/linkedin-to-email")
      .call(
        {
          startUrls: profileUrls.map((url) => ({ url })),
        },
        { waitSecs: 45 }
      );

    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    for (const item of items) {
      const url = (item as Record<string, unknown>).url as string;
      const email = (item as Record<string, unknown>).email as string;
      if (url && email && email.includes("@")) {
        emailMap.set(url, email);
      }
    }
  } catch (error) {
    console.warn(
      "[apify] LinkedIn email enrichment failed (non-critical):",
      error instanceof Error ? error.message : error
    );
  }

  return emailMap;
}

// ====================================
// Instagram via Apify
// Two actors depending on input:
//   Usernames → apify/instagram-profile-scraper (dedicated, 2 params)
//   Search    → apify/instagram-scraper (supports search + searchType)
// Docs:
//   https://apify.com/apify/instagram-profile-scraper
//   https://apify.com/apify/instagram-scraper
//
// IMPORTANT: Neither actor returns businessEmail or businessPhoneNumber.
// Instagram does NOT expose these publicly. Emails must be extracted from
// the biography text or the externalUrl website.
// ====================================

interface ApifyInstagramResult {
  username: string;
  fullName: string;
  biography: string | null;
  followersCount: number;
  followsCount: number;
  postsCount: number;
  isBusinessAccount: boolean;
  businessEmail: string | null;
  businessPhoneNumber: string | null;
  externalUrl: string | null;
  businessCategoryName: string | null;
  profilePicUrl: string | null;
}

export async function scrapeInstagramApify(
  input: { usernames?: string[]; query?: string },
  limit: number = 50,
  apiToken?: string
): Promise<ApifyInstagramResult[]> {
  const client = await getApifyClient(apiToken);

  if (input.usernames && input.usernames.length > 0) {
    // ── Specific usernames → apify/instagram-profile-scraper ──
    // This actor only accepts usernames (not search queries)
    const cleanUsernames = input.usernames
      .map((u) => u.replace(/^@/, "").trim())
      .filter(Boolean);

    const run = await client
      .actor("apify/instagram-profile-scraper")
      .call(
        { usernames: cleanUsernames },
        { waitSecs: 55 }
      );

    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    return mapInstagramResults(items);

  } else if (input.query) {
    // ── Keyword search → apify/instagram-scraper ──
    // This actor supports search with searchType: "user"
    const run = await client
      .actor("apify/instagram-scraper")
      .call(
        {
          search: input.query,
          searchType: "user",
          resultsType: "details",
          searchLimit: Math.min(limit, 250), // Actor max: 250
        },
        { waitSecs: 55 }
      );

    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    return mapInstagramResults(items);
  }

  return [];
}

/** Map raw Apify items to our interface (works for both Instagram actors) */
function mapInstagramResults(
  items: Record<string, unknown>[]
): ApifyInstagramResult[] {
  return items.map((item) => ({
    username: (item.username as string) || "",
    fullName: (item.fullName as string) || "",
    biography: (item.biography as string) || null,
    followersCount: (item.followersCount as number) || 0,
    followsCount: (item.followsCount as number) || 0,
    postsCount: (item.postsCount as number) || 0,
    isBusinessAccount: (item.isBusinessAccount as boolean) || false,
    businessEmail: (item.businessEmail as string) || null,
    businessPhoneNumber: (item.businessPhoneNumber as string) || null,
    externalUrl: (item.externalUrl as string) || null,
    businessCategoryName: (item.businessCategoryName as string) || null,
    profilePicUrl: (item.profilePicUrl as string) || null,
  }));
}

// ====================================
// Normalizer — Convert Apify results to unified Lead format
// ====================================

export interface NormalizedLead {
  source: string;
  businessName: string | null;
  contactPerson: string | null;
  contactTitle: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  category: string | null;
  rating: number | null;
  reviewsCount: number | null;
  followers: number | null;
  isBusiness: boolean | null;
  bio: string | null;
  profileUrl: string | null;
}

export function normalizeGoogleMapsApify(
  results: ApifyGoogleMapsResult[]
): NormalizedLead[] {
  return results.map((r) => ({
    source: "google_maps",
    businessName: r.title,
    contactPerson: null,
    contactTitle: null,
    email: r.emails?.[0] || null,
    phone: r.phone,
    website: r.website,
    address: r.address,
    city: r.city,
    category: r.categoryName,
    rating: r.totalScore,
    reviewsCount: r.reviewsCount,
    followers: null,
    isBusiness: true,
    bio: null,
    profileUrl: r.url,
  }));
}

export function normalizeLinkedInApify(
  results: ApifyLinkedInResult[]
): NormalizedLead[] {
  return results.map((r) => ({
    source: "linkedin",
    businessName: r.company,
    contactPerson: r.fullName,
    contactTitle: r.headline,
    email: r.email,
    phone: null,
    website: null,
    address: null,
    city: r.location,
    category: null,
    rating: null,
    reviewsCount: null,
    followers: null,
    isBusiness: null,
    bio: null,
    profileUrl: r.profileUrl,
  }));
}

export function normalizeInstagramApify(
  results: ApifyInstagramResult[]
): NormalizedLead[] {
  return results.map((r) => {
    // Try to extract email from bio if businessEmail is not available
    let email = r.businessEmail;
    if (!email && r.biography) {
      const bioEmail = extractEmailFromText(r.biography);
      if (bioEmail) email = bioEmail;
    }

    return {
      source: "instagram",
      businessName: r.isBusinessAccount ? r.fullName : null,
      contactPerson: r.fullName,
      contactTitle: null,
      email,
      phone: r.businessPhoneNumber,
      website: r.externalUrl,
      address: null,
      city: null,
      category: r.businessCategoryName,
      rating: null,
      reviewsCount: null,
      followers: r.followersCount,
      isBusiness: r.isBusinessAccount,
      bio: r.biography,
      profileUrl: `https://instagram.com/${r.username}`,
    };
  });
}

// ====================================
// Facebook via Apify
// Two actors depending on input:
//   Search    → apify/facebook-search-scraper   (keyword + location, uses Google underneath)
//   Page URLs → apify/facebook-pages-scraper    (specific page URLs, full contact info)
// Docs:
//   https://apify.com/apify/facebook-search-scraper
//   https://apify.com/apify/facebook-pages-scraper
//
// IMPORTANT: Both actors return email, phone, website from public page info.
// No login or cookies required. Search max: 1,000 results per keyword-location.
// ====================================

interface ApifyFacebookResult {
  title: string;
  pageUrl: string;
  categories: string[];
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  likes: number | null;
  followers: number | null;
  rating: number | null;
  checkins: number | null;
  about: string | null;
  verified: boolean;
  messenger: string | null;
}

export async function scrapeFacebookApify(
  input: { query?: string; pageUrls?: string[]; location?: string },
  limit: number = 50,
  apiToken?: string
): Promise<ApifyFacebookResult[]> {
  const client = await getApifyClient(apiToken);

  if (input.pageUrls && input.pageUrls.length > 0) {
    // ── Specific page URLs → apify/facebook-pages-scraper ──
    const run = await client
      .actor("apify/facebook-pages-scraper")
      .call(
        {
          startUrls: input.pageUrls.map((url) => ({ url })),
          scrapeAbout: true,
          scrapePosts: false,    // Only need contact info
          scrapeReviews: false,  // Skip to save compute
          scrapeServices: false, // Skip to save compute
          proxyConfiguration: { useApifyProxy: true },
        },
        { waitSecs: 55 }
      );

    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    return mapFacebookResults(items);

  } else if (input.query) {
    // ── Keyword search → apify/facebook-search-scraper ──
    const actorInput: Record<string, unknown> = {
      searchQueries: [input.query],
      proxyConfiguration: { useApifyProxy: true },
    };

    if (input.location) {
      actorInput.location = input.location;
    }

    if (limit) {
      actorInput.maxResults = Math.min(limit, 1000); // Actor max: 1,000
    }

    const run = await client
      .actor("apify/facebook-search-scraper")
      .call(actorInput, { waitSecs: 55 });

    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    return mapFacebookResults(items);
  }

  return [];
}

/** Map raw Apify Facebook items to our interface (works for both actors) */
function mapFacebookResults(
  items: Record<string, unknown>[]
): ApifyFacebookResult[] {
  return items.map((item) => {
    // Handle address — can be string or object depending on actor
    let address: string | null = null;
    if (typeof item.address === "string") {
      address = item.address || null;
    } else if (item.address && typeof item.address === "object") {
      const addr = item.address as Record<string, unknown>;
      address = [addr.street, addr.city, addr.state, addr.zip]
        .filter(Boolean)
        .join(", ") || null;
    }

    // Categories: array in both actors
    const categories = Array.isArray(item.categories)
      ? (item.categories as string[])
      : [];

    return {
      title: (item.title as string) || (item.name as string) || "",
      pageUrl: (item.pageUrl as string) || (item.url as string) || "",
      categories,
      email: (item.email as string) || null,
      phone: (item.phone as string) || null,
      website: (item.website as string) || null,
      address,
      likes: (item.likes as number) || null,
      followers: (item.followers as number) || null,
      rating: (item.rating as number) || null,
      checkins: (item.checkins as number) || null,
      about: (item.about as string) || (item.description as string) || null,
      verified: (item.verified as boolean) || false,
      messenger: (item.messenger as string) || null,
    };
  });
}

export function normalizeFacebookApify(
  results: ApifyFacebookResult[]
): NormalizedLead[] {
  return results.map((r) => {
    // Try to extract email from about/bio if not available directly
    let email = r.email;
    if (!email && r.about) {
      const bioEmail = extractEmailFromText(r.about);
      if (bioEmail) email = bioEmail;
    }

    return {
      source: "facebook",
      businessName: r.title,
      contactPerson: null,
      contactTitle: null,
      email,
      phone: r.phone,
      website: r.website,
      address: r.address,
      city: null, // Not directly available — extracted from address if needed
      category: r.categories[0] || null,
      rating: r.rating,
      reviewsCount: r.checkins, // Use checkins as a proxy for engagement
      followers: r.followers,
      isBusiness: true,
      bio: r.about,
      profileUrl: r.pageUrl,
    };
  });
}

// ====================================
// Email Enrichment Utilities
// ====================================

/**
 * Extract email addresses from free text (bio, description, etc.)
 */
function extractEmailFromText(text: string): string | null {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = text.match(emailRegex);
  if (!matches || matches.length === 0) return null;
  // Return the first valid-looking email (skip common false positives)
  for (const match of matches) {
    const lower = match.toLowerCase();
    if (
      !lower.endsWith("@example.com") &&
      !lower.endsWith("@test.com") &&
      !lower.includes("noreply")
    ) {
      return match;
    }
  }
  return matches[0];
}

/**
 * Enrich leads with emails by scraping their websites.
 * Actor: anchor/email-phone-extractor
 * Docs: https://apify.com/anchor/email-phone-extractor
 *
 * Optimized params based on documentation:
 * - maxDepth: 2 (contact info is typically within 2 clicks of homepage)
 * - sameDomain: true (avoid crawling external links)
 * - maxRequestsPerStartUrl: 5 (limit per-domain crawling)
 * - proxyConfig: useApifyProxy (avoid blocks/timeouts)
 */
export async function enrichEmailsFromWebsites(
  websiteUrls: string[],
  apiToken?: string
): Promise<Map<string, { email: string | null; phone: string | null }>> {
  const resultMap = new Map<string, { email: string | null; phone: string | null }>();
  if (websiteUrls.length === 0) return resultMap;

  // Limit to max 20 websites per batch to avoid timeout
  const urls = websiteUrls.slice(0, 20);

  try {
    const client = await getApifyClient(apiToken);

    const run = await client
      .actor("anchor/email-phone-extractor")
      .call(
        {
          startUrls: urls.map((url) => ({ url })),
          maxDepth: 2, // Follow links 2 levels deep (contact/about pages)
          sameDomain: true, // Stay within the same domain
          maxRequestsPerStartUrl: 5, // Max 5 pages per website
          maxRequests: urls.length * 5, // Global cap
          proxyConfig: { useApifyProxy: true }, // Avoid blocks
          considerChildFrames: true, // Check iframes for contact info
        },
        { waitSecs: 40 }
      );

    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    for (const item of items) {
      const rec = item as Record<string, unknown>;
      const pageUrl = (rec.url as string) || (rec.website as string) || "";
      const emails = (rec.emails as string[]) || [];
      const phones = (rec.phones as string[]) || (rec.phoneNumbers as string[]) || [];

      // Match back to the original website URL
      for (const origUrl of urls) {
        try {
          const origHost = new URL(origUrl).hostname.replace("www.", "");
          if (pageUrl.includes(origHost) && !resultMap.has(origUrl)) {
            resultMap.set(origUrl, {
              email: emails[0] || null,
              phone: phones[0] || null,
            });
          }
        } catch {
          // Invalid URL, skip
        }
      }
    }
  } catch (error) {
    console.warn(
      "[apify] Website email enrichment failed (non-critical):",
      error instanceof Error ? error.message : error
    );
  }

  return resultMap;
}

/**
 * Apply email enrichment to normalized leads that have website but no email.
 * Mutates the leads array in place.
 */
export async function enrichLeadsWithEmails(
  leads: NormalizedLead[],
  apiToken?: string
): Promise<number> {
  // Collect leads that need enrichment
  const needsEmail = leads.filter((l) => !l.email && l.website);
  if (needsEmail.length === 0) return 0;

  const websiteUrls = needsEmail
    .map((l) => l.website!)
    .filter((url) => url.startsWith("http"));

  if (websiteUrls.length === 0) return 0;

  const enriched = await enrichEmailsFromWebsites(websiteUrls, apiToken);
  let count = 0;

  for (const lead of needsEmail) {
    if (!lead.website) continue;
    const data = enriched.get(lead.website);
    if (data) {
      if (data.email && !lead.email) {
        lead.email = data.email;
        count++;
      }
      if (data.phone && !lead.phone) {
        lead.phone = data.phone;
      }
    }
  }

  return count;
}
