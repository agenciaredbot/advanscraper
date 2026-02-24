import * as cheerio from "cheerio";

// Regex for matching email addresses
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Common paths where contact info is found
const CONTACT_PATHS = ["/", "/contact", "/contacto", "/about", "/about-us", "/sobre-nosotros"];

// Domains to ignore (common false positives)
const IGNORED_DOMAINS = [
  "example.com",
  "yourdomain.com",
  "domain.com",
  "email.com",
  "test.com",
  "sentry.io",
  "wixpress.com",
  "wordpress.org",
  "w3.org",
  "schema.org",
  "googleapis.com",
  "google.com",
  "facebook.com",
  "twitter.com",
  "instagram.com",
];

/**
 * Extract emails from a website by visiting common contact pages
 */
export async function extractEmailsFromWebsite(
  websiteUrl: string,
  options: { timeout?: number; maxPages?: number } = {}
): Promise<string[]> {
  const { timeout = 8000, maxPages = 3 } = options;
  const foundEmails = new Set<string>();

  // Normalize base URL
  let baseUrl: string;
  try {
    const parsed = new URL(
      websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`
    );
    baseUrl = `${parsed.protocol}//${parsed.hostname}`;
  } catch {
    return [];
  }

  // Try different paths
  const pathsToCheck = CONTACT_PATHS.slice(0, maxPages);

  for (const path of pathsToCheck) {
    try {
      const url = `${baseUrl}${path}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        redirect: "follow",
      });

      clearTimeout(timeoutId);

      if (!response.ok) continue;

      const html = await response.text();
      const emails = extractEmailsFromHtml(html);
      emails.forEach((email) => foundEmails.add(email));

      // If we found emails, stop early
      if (foundEmails.size > 0) break;
    } catch {
      // Timeout or network error, skip this path
      continue;
    }
  }

  return Array.from(foundEmails);
}

/**
 * Extract emails from raw HTML content
 */
export function extractEmailsFromHtml(html: string): string[] {
  const emails = new Set<string>();

  // Method 1: Regex on raw HTML
  const rawMatches = html.match(EMAIL_REGEX) || [];
  rawMatches.forEach((email) => emails.add(email.toLowerCase()));

  // Method 2: Parse HTML and check mailto links
  try {
    const $ = cheerio.load(html);
    $('a[href^="mailto:"]').each((_, el) => {
      const href = $(el).attr("href");
      if (href) {
        const email = href.replace("mailto:", "").split("?")[0].trim().toLowerCase();
        if (EMAIL_REGEX.test(email)) {
          emails.add(email);
        }
      }
    });
  } catch {
    // If cheerio parsing fails, we still have regex results
  }

  // Filter out ignored/invalid emails
  return Array.from(emails).filter((email) => {
    const domain = email.split("@")[1];
    if (!domain) return false;
    if (IGNORED_DOMAINS.some((ignored) => domain.includes(ignored))) return false;
    if (email.includes("..")) return false;
    if (email.length > 254) return false;
    // Ignore common placeholder patterns
    if (email.startsWith("info@") && domain.length < 5) return false;
    return true;
  });
}
