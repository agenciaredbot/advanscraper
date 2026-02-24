// Early startup log — if you never see this, the container didn't boot at all
console.log("🔄 Starting Playwright Scraper Microservice...");
console.log(`   Node ${process.version} | PID ${process.pid}`);
console.log(`   PORT=${process.env.PORT || "(not set, defaulting to 3001)"}`);
console.log(`   API_KEY=${process.env.API_KEY ? "✅ set" : "❌ MISSING"}`);

import Fastify from "fastify";
import { scrapeGoogleMaps, type GoogleMapsResult } from "./scrapers/google-maps.js";
import { scrapeLinkedIn, type LinkedInResult } from "./scrapers/linkedin.js";
import {
  scrapeInstagramProfile,
  searchInstagramProfiles,
  scrapeInstagramBulk,
  type InstagramProfile,
} from "./scrapers/instagram.js";
import { browserPool } from "./browser/pool.js";

// --- Config ---
const PORT = parseInt(process.env.PORT || "3001", 10);
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("⚠️  WARNING: API_KEY environment variable is not set!");
  console.error("   Auth will reject all /scrape/* requests.");
  // Don't exit — let the health endpoint still work so Railway sees it's alive
}

// --- Fastify Instance ---
const fastify = Fastify({
  logger: true,
  requestTimeout: 150000, // 2.5 min global timeout
});

// --- Auth Hook (only for /scrape/* routes) ---
fastify.addHook("onRequest", async (request, reply) => {
  if (request.url.startsWith("/scrape")) {
    const key = request.headers["x-api-key"];
    if (!API_KEY || key !== API_KEY) {
      reply.code(401).send({ error: "Invalid or missing API key" });
    }
  }
});

// --- Health Check ---
fastify.get("/health", async () => {
  return {
    status: "ok",
    activeSessions: browserPool.activeCount,
    queuedRequests: browserPool.queueLength,
    maxSessions: browserPool.maxSessions,
    uptime: Math.floor(process.uptime()),
    memoryMB: Math.floor(process.memoryUsage().heapUsed / 1024 / 1024),
  };
});

// --- Google Maps Scrape ---
interface GoogleMapsBody {
  query: string;
  location?: string;
  maxResults?: number;
  extractEmails?: boolean;
}

fastify.post<{ Body: GoogleMapsBody }>("/scrape/google-maps", async (request, reply) => {
  const { query, location, maxResults = 10, extractEmails = false } = request.body || {};

  if (!query || typeof query !== "string" || query.trim().length === 0) {
    return reply.code(400).send({ error: "Field 'query' is required" });
  }

  const cappedMax = Math.min(Math.max(1, maxResults), 80);
  const startTime = Date.now();

  try {
    console.log(`\n🗺️  Google Maps scrape request: "${query}" in "${location || "any"}" (max: ${cappedMax})`);

    const results: GoogleMapsResult[] = await scrapeGoogleMaps({
      query: query.trim(),
      location: location?.trim(),
      maxResults: cappedMax,
      extractEmails,
    });

    const duration = Date.now() - startTime;
    console.log(`✅ Google Maps scrape completed: ${results.length} results in ${duration}ms`);

    return {
      success: true,
      results,
      count: results.length,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`❌ Google Maps scrape failed after ${duration}ms:`, errorMsg);

    return reply.code(500).send({
      success: false,
      error: errorMsg,
      duration,
    });
  }
});

// --- LinkedIn Scrape ---
interface LinkedInBody {
  keyword: string;
  location?: string;
  maxResults?: number;
}

fastify.post<{ Body: LinkedInBody }>("/scrape/linkedin", async (request, reply) => {
  const { keyword, location, maxResults = 20 } = request.body || {};

  if (!keyword || typeof keyword !== "string" || keyword.trim().length === 0) {
    return reply.code(400).send({ error: "Field 'keyword' is required" });
  }

  const cappedMax = Math.min(Math.max(1, maxResults), 50);
  const startTime = Date.now();

  try {
    console.log(`\n🔗 LinkedIn scrape request: "${keyword}" in "${location || "any"}" (max: ${cappedMax})`);

    const results: LinkedInResult[] = await scrapeLinkedIn({
      keyword: keyword.trim(),
      location: location?.trim(),
      maxResults: cappedMax,
    });

    const duration = Date.now() - startTime;
    console.log(`✅ LinkedIn scrape completed: ${results.length} results in ${duration}ms`);

    return {
      success: true,
      results,
      count: results.length,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`❌ LinkedIn scrape failed after ${duration}ms:`, errorMsg);

    return reply.code(500).send({
      success: false,
      error: errorMsg,
      duration,
    });
  }
});

// --- Instagram: Single Profile ---
interface InstagramProfileBody {
  username: string;
}

fastify.post<{ Body: InstagramProfileBody }>("/scrape/profile", async (request, reply) => {
  const { username } = request.body || {};

  if (!username || typeof username !== "string" || username.trim().length === 0) {
    return reply.code(400).send({ error: "Field 'username' is required" });
  }

  const startTime = Date.now();

  try {
    const cleanUsername = username.trim().replace("@", "");
    console.log(`\n📸 Instagram profile request: @${cleanUsername}`);

    const profile: InstagramProfile | null = await scrapeInstagramProfile(cleanUsername);
    const duration = Date.now() - startTime;

    if (!profile) {
      console.log(`⚠️ Instagram profile not found: @${cleanUsername} (${duration}ms)`);
      return reply.code(404).send({ error: "Profile not found or private", duration });
    }

    console.log(`✅ Instagram profile scraped: @${cleanUsername} in ${duration}ms`);
    return profile; // Return directly to match the expected interface
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`❌ Instagram profile failed after ${duration}ms:`, errorMsg);
    return reply.code(500).send({ error: errorMsg, duration });
  }
});

// --- Instagram: Search ---
interface InstagramSearchBody {
  query: string;
  limit?: number;
}

fastify.post<{ Body: InstagramSearchBody }>("/scrape/search", async (request, reply) => {
  const { query, limit = 20 } = request.body || {};

  if (!query || typeof query !== "string" || query.trim().length === 0) {
    return reply.code(400).send({ error: "Field 'query' is required" });
  }

  const cappedLimit = Math.min(Math.max(1, limit), 30);
  const startTime = Date.now();

  try {
    console.log(`\n📸 Instagram search request: "${query}" (max: ${cappedLimit})`);

    const profiles: InstagramProfile[] = await searchInstagramProfiles(query.trim(), cappedLimit);
    const duration = Date.now() - startTime;

    console.log(`✅ Instagram search completed: ${profiles.length} profiles in ${duration}ms`);
    return { profiles, count: profiles.length, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`❌ Instagram search failed after ${duration}ms:`, errorMsg);
    return reply.code(500).send({ error: errorMsg, duration });
  }
});

// --- Instagram: Bulk ---
interface InstagramBulkBody {
  usernames: string[];
}

fastify.post<{ Body: InstagramBulkBody }>("/scrape/bulk", async (request, reply) => {
  const { usernames } = request.body || {};

  if (!usernames || !Array.isArray(usernames) || usernames.length === 0) {
    return reply.code(400).send({ error: "Field 'usernames' must be a non-empty array" });
  }

  const cappedUsernames = usernames.slice(0, 30);
  const startTime = Date.now();

  try {
    console.log(`\n📸 Instagram bulk request: ${cappedUsernames.length} profiles`);

    const profiles: InstagramProfile[] = await scrapeInstagramBulk(cappedUsernames);
    const duration = Date.now() - startTime;

    console.log(`✅ Instagram bulk completed: ${profiles.length}/${cappedUsernames.length} in ${duration}ms`);
    return { profiles, count: profiles.length, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`❌ Instagram bulk failed after ${duration}ms:`, errorMsg);
    return reply.code(500).send({ error: errorMsg, duration });
  }
});

// --- Graceful Shutdown ---
const shutdown = async (signal: string) => {
  console.log(`\n⚡ Received ${signal}, shutting down gracefully...`);
  await fastify.close();
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Catch uncaught errors so we see them in logs
process.on("uncaughtException", (err) => {
  console.error("💥 Uncaught exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("💥 Unhandled rejection:", reason);
  process.exit(1);
});

// --- Start Server ---
const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: "0.0.0.0" });
    console.log(`\n🚀 Playwright Scraper Microservice running on port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health`);
    console.log(`   Max concurrent sessions: ${browserPool.maxSessions}`);
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

start();
