/**
 * MCP Tools — Scraping
 */

import { z } from "zod/v4";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getMcpUser } from "../auth.js";
import { startScrape, checkScrapeStatus } from "@/lib/services/scraping.service";

export function registerScrapingTools(server: McpServer) {
  // ─── Scrape Leads ─────────────────────────────────────────────────────
  server.registerTool("advanscraper_scrape_leads", {
    title: "Scrape Leads",
    description:
      "Start a new lead scraping job. Supports Google Maps, LinkedIn, Instagram, and Facebook. Returns a searchId to check status.",
    inputSchema: {
      source: z
        .enum(["google_maps", "linkedin", "instagram", "facebook"])
        .describe("Source platform to scrape from"),
      query: z.string().describe(
        "Search query. E.g. 'restaurantes en Bogota'"
      ),
      location: z.string().optional().describe(
        "Location filter (optional, for google_maps)"
      ),
      maxResults: z
        .number()
        .optional()
        .default(50)
        .describe("Maximum number of results (default 50)"),
      usernames: z
        .array(z.string())
        .optional()
        .describe("Instagram/Facebook usernames to scrape (for instagram/facebook source)"),
      pageUrls: z
        .array(z.string())
        .optional()
        .describe("Facebook page URLs to scrape (for facebook source)"),
    },
  }, async (args) => {
    const user = await getMcpUser();
    const result = await startScrape(user.userId, user.email, {
      source: args.source,
      query: args.query,
      location: args.location,
      maxResults: args.maxResults,
      usernames: args.usernames,
      pageUrls: args.pageUrls,
    });
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  });

  // ─── Check Scrape Status ──────────────────────────────────────────────
  server.registerTool("advanscraper_check_scrape_status", {
    title: "Check Scrape Status",
    description:
      "Check the status of a running scrape job. Returns progress, status, and results when complete.",
    inputSchema: {
      searchId: z.string().describe("The search ID returned from scrape_leads"),
    },
  }, async (args) => {
    const user = await getMcpUser();
    const result = await checkScrapeStatus(
      user.userId,
      user.email,
      args.searchId
    );
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  });
}
