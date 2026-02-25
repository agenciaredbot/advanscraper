/**
 * Apify API integration for premium/massive scraping
 *
 * Uses Apify actors for Google Maps, LinkedIn, and Instagram scraping
 * with much higher limits than free scrapers.
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
// ====================================

interface ApifyGoogleMapsInput {
  searchStringsArray: string[];
  locationQuery?: string;
  maxCrawledPlacesPerSearch?: number;
  language?: string;
  includeWebResults?: boolean;
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
  };

  if (location) {
    input.locationQuery = location;
  }

  // Run the Google Maps Scraper actor
  const run = await client
    .actor("compass/crawler-google-places")
    .call(input, { waitSecs: 55 });

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
// LinkedIn via Apify
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

  const searchUrl = location
    ? `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(keyword)}&geoUrn=${encodeURIComponent(location)}`
    : `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(keyword)}`;

  const run = await client
    .actor("curious_coder/linkedin-profile-scraper")
    .call(
      {
        startUrls: [{ url: searchUrl }],
        maxResults: limit,
      },
      { waitSecs: 55 }
    );

  const { items } = await client.dataset(run.defaultDatasetId).listItems();

  return items.map((item: Record<string, unknown>) => ({
    fullName: (item.fullName as string) || (item.name as string) || "",
    headline: (item.headline as string) || null,
    company: (item.company as string) || null,
    location: (item.location as string) || null,
    profileUrl: (item.profileUrl as string) || (item.url as string) || "",
    email: (item.email as string) || (item.emailAddress as string) || null,
  }));
}

/**
 * Enrich LinkedIn profiles with emails using anchor/linkedin-to-email actor.
 * Takes profile URLs and returns a map of URL → email.
 * Only processes profiles that don't already have emails.
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
          urls: profileUrls.map((url) => ({ url })),
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

  const actorInput: Record<string, unknown> = {
    resultsLimit: limit,
  };

  if (input.usernames && input.usernames.length > 0) {
    actorInput.directUrls = input.usernames.map(
      (u) => `https://www.instagram.com/${u}/`
    );
  } else if (input.query) {
    actorInput.search = input.query;
    actorInput.searchType = "user";
  }

  const run = await client
    .actor("apify/instagram-profile-scraper")
    .call(actorInput, { waitSecs: 55 });

  const { items } = await client.dataset(run.defaultDatasetId).listItems();

  return items.map((item: Record<string, unknown>) => ({
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
    source: "apify",
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
    source: "apify",
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
      source: "apify",
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
 * Uses anchor/email-phone-extractor actor.
 * Takes website URLs and returns a map of URL → { email, phone }.
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
          maxDepth: 1,
          maxRequests: urls.length * 3, // visit up to 3 pages per site
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
