/**
 * Apify API integration for premium/massive scraping
 *
 * Uses Apify actors for Google Maps, LinkedIn, and Instagram scraping
 * with much higher limits than free scrapers.
 */

import { ApifyClient } from "apify-client";

// Get API token from user profile or env
function getApifyClient(apiToken?: string): ApifyClient {
  const token = apiToken || process.env.APIFY_API_TOKEN;
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
  const client = getApifyClient(apiToken);

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
}

export async function scrapeLinkedInApify(
  keyword: string,
  location: string | undefined,
  limit: number = 50,
  apiToken?: string
): Promise<ApifyLinkedInResult[]> {
  const client = getApifyClient(apiToken);

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
  }));
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
  const client = getApifyClient(apiToken);

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
    email: null,
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
  return results.map((r) => ({
    source: "apify",
    businessName: r.isBusinessAccount ? r.fullName : null,
    contactPerson: r.fullName,
    contactTitle: null,
    email: r.businessEmail,
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
  }));
}
