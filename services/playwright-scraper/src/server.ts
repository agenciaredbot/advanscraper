import Fastify from "fastify";
import { scrapeGoogleMaps, type GoogleMapsResult } from "./scrapers/google-maps.js";
import { scrapeLinkedIn, type LinkedInResult } from "./scrapers/linkedin.js";
import { browserPool } from "./browser/pool.js";

// --- Config ---
const PORT = parseInt(process.env.PORT || "3001", 10);
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("❌ API_KEY environment variable is required");
  process.exit(1);
}

// --- Fastify Instance ---
const fastify = Fastify({
  logger: {
    level: "info",
    transport: {
      target: "pino-pretty" in process.versions ? "pino-pretty" : undefined!,
    },
  },
  requestTimeout: 150000, // 2.5 min global timeout
});

// --- Auth Hook (only for /scrape/* routes) ---
fastify.addHook("onRequest", async (request, reply) => {
  if (request.url.startsWith("/scrape")) {
    const key = request.headers["x-api-key"];
    if (key !== API_KEY) {
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
  const { query, location, maxResults = 20, extractEmails = true } = request.body || {};

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

// --- Graceful Shutdown ---
const shutdown = async (signal: string) => {
  console.log(`\n⚡ Received ${signal}, shutting down gracefully...`);
  await fastify.close();
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

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
