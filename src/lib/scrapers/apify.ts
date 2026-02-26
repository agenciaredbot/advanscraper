/**
 * Apify REST API integration for lead scraping
 *
 * IMPORTANT: Uses direct fetch() calls instead of apify-client npm package.
 * The apify-client package uses dynamic imports that are incompatible with
 * Next.js 16 Turbopack bundler ("Cannot find module as expression is too dynamic").
 *
 * Actors used:
 * SCRAPING:
 * - Google Maps:  compass/crawler-google-places
 * - LinkedIn:     harvestapi/linkedin-profile-search (NO cookies, built-in email search)
 * - Instagram:    apify/instagram-profile-scraper    (specific usernames)
 *                 apify/instagram-scraper            (keyword search)
 * - Facebook:     apify/facebook-search-scraper      (keyword + location search)
 *                 apify/facebook-pages-scraper       (specific page URLs)
 *
 * ENRICHMENT:
 * - LinkedIn→Email:  anchor/linkedin-to-email
 * - Website→Email:   anchor/email-phone-extractor
 */

import { resolveApiKey, SYSTEM_KEY_NAMES } from "@/lib/api-keys";

const APIFY_BASE = "https://api.apify.com/v2";

// ─── REST API helpers ─────────────────────────────────────────────────────────

async function getApifyToken(apiToken?: string): Promise<string> {
  const token = await resolveApiKey(SYSTEM_KEY_NAMES.APIFY_API_TOKEN, apiToken);
  if (!token) throw new Error("Apify API token no configurado");
  return token;
}

/**
 * Run an Apify actor and wait for results.
 * Uses the synchronous run endpoint with waitForFinish param.
 */
async function runActor(
  actorId: string,
  input: Record<string, unknown>,
  token: string,
  waitSecs: number = 45
): Promise<Record<string, unknown>[]> {
  // Start the actor run and wait for it to finish
  const runRes = await fetch(
    `${APIFY_BASE}/acts/${encodeURIComponent(actorId)}/runs?waitForFinish=${waitSecs}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(input),
    }
  );

  if (!runRes.ok) {
    const errText = await runRes.text().catch(() => "Unknown error");
    throw new Error(`Apify actor ${actorId} failed (${runRes.status}): ${errText}`);
  }

  const runData = await runRes.json();
  const run = runData?.data;

  if (!run?.defaultDatasetId) {
    throw new Error(`Apify actor ${actorId}: no dataset returned`);
  }

  // Check if run finished successfully
  if (run.status !== "SUCCEEDED") {
    if (run.status === "RUNNING") {
      throw new Error(`Apify actor ${actorId} timeout: still running after ${waitSecs}s`);
    }
    throw new Error(`Apify actor ${actorId} failed with status: ${run.status}`);
  }

  // Fetch dataset items
  const dataRes = await fetch(
    `${APIFY_BASE}/datasets/${run.defaultDatasetId}/items?format=json`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!dataRes.ok) {
    throw new Error(`Failed to fetch dataset: ${dataRes.status}`);
  }

  return await dataRes.json();
}

// ====================================
// Google Maps via Apify
// Actor: compass/crawler-google-places
// ====================================

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
  const token = await getApifyToken(apiToken);

  const input: Record<string, unknown> = {
    searchStringsArray: [location ? `${query} en ${location}` : query],
    maxCrawledPlacesPerSearch: limit,
    language: "es",
    includeWebResults: false,
    // NOTE: scrapeContacts NOT used — it visits each website (2-5 min).
    // Email enrichment is done separately via enrichEmailsFromWebsites().
  };

  if (location) {
    input.locationQuery = location;
  }

  const items = await runActor("compass/crawler-google-places", input, token, 45);

  return items.map((item) => ({
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
  const token = await getApifyToken(apiToken);

  const actorInput: Record<string, unknown> = {
    searchQuery: keyword,
    profileScraperMode: "Full + email search",
    maxItems: limit,
  };

  if (location) {
    actorInput.locations = [location];
  }

  const items = await runActor("harvestapi/linkedin-profile-search", actorInput, token, 55);

  return items.map((item) => {
    const firstName = (item.firstName as string) || "";
    const lastName = (item.lastName as string) || "";
    const fullName = `${firstName} ${lastName}`.trim();

    const currentPosition = item.currentPosition as Array<Record<string, unknown>> | undefined;
    const company = (currentPosition?.[0]?.companyName as string) || null;

    const loc = item.location as Record<string, unknown> | undefined;
    const locationText = (loc?.linkedinText as string) || null;

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
 * Backup enrichment: Find emails for LinkedIn profiles.
 * Actor: anchor/linkedin-to-email
 */
export async function enrichLinkedInEmails(
  profileUrls: string[],
  apiToken?: string
): Promise<Map<string, string>> {
  const emailMap = new Map<string, string>();
  if (profileUrls.length === 0) return emailMap;

  try {
    const token = await getApifyToken(apiToken);

    const items = await runActor(
      "anchor/linkedin-to-email",
      { startUrls: profileUrls.map((url) => ({ url })) },
      token,
      45
    );

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
  const token = await getApifyToken(apiToken);

  if (input.usernames && input.usernames.length > 0) {
    const cleanUsernames = input.usernames
      .map((u) => u.replace(/^@/, "").trim())
      .filter(Boolean);

    const items = await runActor(
      "apify/instagram-profile-scraper",
      { usernames: cleanUsernames },
      token,
      55
    );
    return mapInstagramResults(items);

  } else if (input.query) {
    const items = await runActor(
      "apify/instagram-scraper",
      {
        search: input.query,
        searchType: "user",
        resultsType: "details",
        searchLimit: Math.min(limit, 250),
      },
      token,
      55
    );
    return mapInstagramResults(items);
  }

  return [];
}

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
  firstName: string | null;
  lastName: string | null;
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
  state: string | null;
  industry: string | null;
  linkedinUrl: string | null;
  googleMapsUrl: string | null;
}

/** Split a full name into firstName and lastName */
function splitName(fullName: string | null): { firstName: string | null; lastName: string | null } {
  if (!fullName) return { firstName: null, lastName: null };
  const parts = fullName.trim().split(/\s+/);
  return {
    firstName: parts[0] || null,
    lastName: parts.length > 1 ? parts.slice(1).join(" ") : null,
  };
}

export function normalizeGoogleMapsApify(
  results: ApifyGoogleMapsResult[]
): NormalizedLead[] {
  return results.map((r) => ({
    source: "google_maps",
    businessName: r.title,
    contactPerson: null,
    firstName: null,
    lastName: null,
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
    state: null,
    industry: r.categoryName || null,
    linkedinUrl: null,
    googleMapsUrl: r.url || null,
  }));
}

export function normalizeLinkedInApify(
  results: ApifyLinkedInResult[]
): NormalizedLead[] {
  return results.map((r) => {
    const { firstName, lastName } = splitName(r.fullName);
    return {
      source: "linkedin",
      businessName: r.company,
      contactPerson: r.fullName,
      firstName,
      lastName,
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
      state: null,
      industry: null,
      linkedinUrl: r.profileUrl || null,
      googleMapsUrl: null,
    };
  });
}

export function normalizeInstagramApify(
  results: ApifyInstagramResult[]
): NormalizedLead[] {
  return results.map((r) => {
    let email = r.businessEmail;
    if (!email && r.biography) {
      const bioEmail = extractEmailFromText(r.biography);
      if (bioEmail) email = bioEmail;
    }

    const { firstName, lastName } = splitName(r.fullName);
    return {
      source: "instagram",
      businessName: r.isBusinessAccount ? r.fullName : null,
      contactPerson: r.fullName,
      firstName,
      lastName,
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
      state: null,
      industry: null,
      linkedinUrl: null,
      googleMapsUrl: null,
    };
  });
}

// ====================================
// Facebook via Apify
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
  const token = await getApifyToken(apiToken);

  if (input.pageUrls && input.pageUrls.length > 0) {
    const items = await runActor(
      "apify/facebook-pages-scraper",
      {
        startUrls: input.pageUrls.map((url) => ({ url })),
        scrapeAbout: true,
        scrapePosts: false,
        scrapeReviews: false,
        scrapeServices: false,
        proxyConfiguration: { useApifyProxy: true },
      },
      token,
      55
    );
    return mapFacebookResults(items);

  } else if (input.query) {
    // Phase 1: Search for page URLs using danek/facebook-search-ppr
    const searchQuery = input.location
      ? `${input.query} ${input.location}`
      : input.query;

    const searchItems = await runActor(
      "danek/facebook-search-ppr",
      {
        query: searchQuery,
        search_type: "pages",
        max_posts: 0,
        max_results: Math.min(limit, 100),
      },
      token,
      45
    );

    // Extract page URLs from search results
    const pageUrls = searchItems
      .filter((r) => r.url || r.profile_url)
      .map((r) => ({ url: (r.url as string) || (r.profile_url as string) }))
      .slice(0, 20);

    if (pageUrls.length === 0) return [];

    // Phase 2: Enrich with full contact data using pages-scraper
    const enrichedItems = await runActor(
      "apify/facebook-pages-scraper",
      {
        startUrls: pageUrls,
        scrapeAbout: true,
        scrapePosts: false,
        scrapeReviews: false,
        scrapeServices: false,
        proxyConfiguration: { useApifyProxy: true },
      },
      token,
      55
    );

    return mapFacebookResults(enrichedItems);
  }

  return [];
}

function mapFacebookResults(
  items: Record<string, unknown>[]
): ApifyFacebookResult[] {
  return items.map((item) => {
    // Handle address — can be string or object
    let address: string | null = null;
    if (typeof item.address === "string") {
      address = item.address || null;
    } else if (item.address && typeof item.address === "object") {
      const addr = item.address as Record<string, unknown>;
      address = [addr.street, addr.city, addr.state, addr.zip]
        .filter(Boolean)
        .join(", ") || null;
    }

    // Handle categories — array of strings
    const categories = Array.isArray(item.categories)
      ? (item.categories as string[])
      : [];

    // Handle website — pages-scraper returns "website" + "websites" array
    const isMapsUrl = (url: string) => url.includes("maps.google.com") || url.includes("maps.app.goo.gl");
    let website = (item.website as string) || null;
    if (website && isMapsUrl(website)) website = null; // Skip maps URLs
    if (!website && Array.isArray(item.websites)) {
      const websites = item.websites as string[];
      website = websites.find((w) => !isMapsUrl(w)) || null;
    }

    // Handle about/description — pages-scraper uses "intro"
    const about = (item.about as string)
      || (item.description as string)
      || (item.intro as string)
      || null;

    return {
      title: (item.title as string) || (item.name as string) || (item.pageName as string) || "",
      pageUrl: (item.pageUrl as string) || (item.facebookUrl as string) || (item.url as string) || "",
      categories,
      email: (item.email as string) || null,
      phone: (item.phone as string) || null,
      website,
      address,
      likes: typeof item.likes === "number" ? item.likes : null,
      followers: typeof item.followers === "number" ? item.followers : null,
      rating: typeof item.rating === "number" ? item.rating : (typeof item.rating === "string" ? parseFloat(item.rating) || null : null),
      checkins: typeof item.checkins === "number" ? item.checkins : null,
      about,
      verified: (item.verified as boolean) || (item.is_verified as boolean) || false,
      messenger: (item.messenger as string) || null,
    };
  });
}

export function normalizeFacebookApify(
  results: ApifyFacebookResult[]
): NormalizedLead[] {
  return results.map((r) => {
    let email = r.email;
    if (!email && r.about) {
      const bioEmail = extractEmailFromText(r.about);
      if (bioEmail) email = bioEmail;
    }

    return {
      source: "facebook",
      businessName: r.title,
      contactPerson: null,
      firstName: null,
      lastName: null,
      contactTitle: null,
      email,
      phone: r.phone,
      website: r.website,
      address: r.address,
      city: null,
      category: r.categories[0] || null,
      rating: r.rating,
      reviewsCount: r.checkins,
      followers: r.followers,
      isBusiness: true,
      bio: r.about,
      profileUrl: r.pageUrl,
      state: null,
      industry: r.categories?.[0] || null,
      linkedinUrl: null,
      googleMapsUrl: null,
    };
  });
}

// ====================================
// Email Enrichment Utilities
// ====================================

function extractEmailFromText(text: string): string | null {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = text.match(emailRegex);
  if (!matches || matches.length === 0) return null;
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
 */
export async function enrichEmailsFromWebsites(
  websiteUrls: string[],
  apiToken?: string
): Promise<Map<string, { email: string | null; phone: string | null }>> {
  const resultMap = new Map<string, { email: string | null; phone: string | null }>();
  if (websiteUrls.length === 0) return resultMap;

  const urls = websiteUrls.slice(0, 20);

  try {
    const token = await getApifyToken(apiToken);

    const items = await runActor(
      "anchor/email-phone-extractor",
      {
        startUrls: urls.map((url) => ({ url })),
        maxDepth: 2,
        sameDomain: true,
        maxRequestsPerStartUrl: 5,
        maxRequests: urls.length * 5,
        proxyConfig: { useApifyProxy: true },
        considerChildFrames: true,
      },
      token,
      40
    );

    for (const item of items) {
      const rec = item as Record<string, unknown>;
      const pageUrl = (rec.url as string) || (rec.website as string) || "";
      const emails = (rec.emails as string[]) || [];
      const phones = (rec.phones as string[]) || (rec.phoneNumbers as string[]) || [];

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
 */
export async function enrichLeadsWithEmails(
  leads: NormalizedLead[],
  apiToken?: string
): Promise<number> {
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

// ====================================
// ASYNC Apify Functions (Start → Poll → Fetch)
// Used by /api/scrape/start and /api/scrape/status
// ====================================

export interface ActorRunInfo {
  runId: string;
  datasetId: string | null;
  status: string; // READY, RUNNING, SUCCEEDED, FAILED, ABORTING, ABORTED, TIMED-OUT
  startedAt: string | null;
  finishedAt: string | null;
  stats: {
    itemCount: number;
    durationMs: number;
  };
}

/**
 * Start an Apify actor WITHOUT waiting for it to finish.
 * Uses waitForFinish=0 to return immediately.
 */
export async function startActorAsync(
  actorId: string,
  input: Record<string, unknown>,
  token: string
): Promise<ActorRunInfo> {
  const res = await fetch(
    `${APIFY_BASE}/acts/${encodeURIComponent(actorId)}/runs?waitForFinish=0`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(input),
    }
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => "Unknown error");
    throw new Error(`Apify start failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const run = data?.data;

  if (!run?.id) {
    throw new Error("Apify: no run ID returned");
  }

  return {
    runId: run.id,
    datasetId: run.defaultDatasetId || null,
    status: run.status || "RUNNING",
    startedAt: run.startedAt || null,
    finishedAt: run.finishedAt || null,
    stats: {
      itemCount: run.stats?.outputItemCount || 0,
      durationMs: run.stats?.runTimeSecs ? run.stats.runTimeSecs * 1000 : 0,
    },
  };
}

/**
 * Check the status of a running Apify actor.
 */
export async function checkActorRun(
  runId: string,
  token: string
): Promise<ActorRunInfo> {
  const res = await fetch(
    `${APIFY_BASE}/actor-runs/${runId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) {
    throw new Error(`Apify status check failed (${res.status})`);
  }

  const data = await res.json();
  const run = data?.data;

  return {
    runId: run.id,
    datasetId: run.defaultDatasetId || null,
    status: run.status || "UNKNOWN",
    startedAt: run.startedAt || null,
    finishedAt: run.finishedAt || null,
    stats: {
      itemCount: run.stats?.outputItemCount || 0,
      durationMs: run.stats?.runTimeSecs ? run.stats.runTimeSecs * 1000 : 0,
    },
  };
}

/**
 * Fetch results from a completed Apify actor dataset.
 */
export async function fetchActorResults(
  datasetId: string,
  token: string
): Promise<Record<string, unknown>[]> {
  const res = await fetch(
    `${APIFY_BASE}/datasets/${datasetId}/items?format=json`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) {
    throw new Error(`Apify dataset fetch failed (${res.status})`);
  }

  return await res.json();
}

/**
 * Get the actor ID and input configuration for a given source + params.
 * Centralizes the mapping: source → actor + input
 */
export function getActorConfig(
  source: string,
  params: {
    query: string;
    location?: string;
    maxResults?: number;
    usernames?: string[];
    pageUrls?: string[];
  }
): { actorId: string; input: Record<string, unknown> } {
  const { query, location, maxResults = 50, usernames, pageUrls } = params;

  switch (source) {
    case "google_maps": {
      const input: Record<string, unknown> = {
        searchStringsArray: [location ? `${query} en ${location}` : query],
        maxCrawledPlacesPerSearch: maxResults,
        language: "es",
        includeWebResults: false,
      };
      if (location) input.locationQuery = location;
      return { actorId: "compass/crawler-google-places", input };
    }

    case "linkedin": {
      const input: Record<string, unknown> = {
        searchQuery: query,
        profileScraperMode: "Full + email search",
        maxItems: maxResults,
      };
      if (location) input.locations = [location];
      return { actorId: "harvestapi/linkedin-profile-search", input };
    }

    case "instagram": {
      if (usernames && usernames.length > 0) {
        const cleanUsernames = usernames
          .map((u) => u.replace(/^@/, "").trim())
          .filter(Boolean);
        return {
          actorId: "apify/instagram-profile-scraper",
          input: { usernames: cleanUsernames },
        };
      }
      return {
        actorId: "apify/instagram-scraper",
        input: {
          search: query,
          searchType: "user",
          resultsType: "details",
          searchLimit: Math.min(maxResults, 250),
        },
      };
    }

    case "facebook": {
      if (pageUrls && pageUrls.length > 0) {
        // Direct page URLs → scrape full contact info
        return {
          actorId: "apify/facebook-pages-scraper",
          input: {
            startUrls: pageUrls.map((url) => ({ url })),
            scrapeAbout: true,
            scrapePosts: false,
            scrapeReviews: false,
            scrapeServices: false,
            proxyConfiguration: { useApifyProxy: true },
          },
        };
      }
      // Keyword search → Phase 1: find page URLs
      // Uses danek/facebook-search-ppr (1.9M runs, most popular FB search actor)
      // Phase 2 (enrich with contacts) is handled by /api/scrape/status
      return {
        actorId: "danek/facebook-search-ppr",
        input: {
          query: location ? `${query} ${location}` : query,
          search_type: "pages",
          max_posts: 0,
          max_results: Math.min(maxResults, 100),
        },
      };
    }

    default:
      throw new Error(`Fuente desconocida: ${source}`);
  }
}

/**
 * Normalize raw Apify items based on the source type.
 * Dispatcher that calls the correct normalizer.
 */
export function normalizeBySource(
  source: string,
  rawItems: Record<string, unknown>[]
): NormalizedLead[] {
  switch (source) {
    case "google_maps": {
      const typed = rawItems.map((item) => ({
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
      return normalizeGoogleMapsApify(typed);
    }

    case "linkedin": {
      const typed = rawItems.map((item) => {
        const firstName = (item.firstName as string) || "";
        const lastName = (item.lastName as string) || "";
        const fullName = `${firstName} ${lastName}`.trim();
        const currentPosition = item.currentPosition as Array<Record<string, unknown>> | undefined;
        const company = (currentPosition?.[0]?.companyName as string) || null;
        const loc = item.location as Record<string, unknown> | undefined;
        const locationText = (loc?.linkedinText as string) || null;
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
      return normalizeLinkedInApify(typed);
    }

    case "instagram": {
      const typed = mapInstagramResults(rawItems);
      return normalizeInstagramApify(typed);
    }

    case "facebook": {
      const typed = mapFacebookResults(rawItems);
      return normalizeFacebookApify(typed);
    }

    default:
      throw new Error(`normalizeBySource: unknown source "${source}"`);
  }
}
