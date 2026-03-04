#!/usr/bin/env node
/**
 * AdvanScraper MCP Server
 *
 * Exposes all AdvanScraper capabilities as MCP tools,
 * enabling AI agent-to-agent communication.
 *
 * Usage:
 *   ADVANSCRAPER_API_KEY=ask_... npx tsx src/mcp/server.ts
 *
 * Or via npm script:
 *   ADVANSCRAPER_API_KEY=ask_... npm run mcp
 */

import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { registerLeadsTools } from "./tools/leads.tools.js";
import { registerScrapingTools } from "./tools/scraping.tools.js";
import { registerAiTools } from "./tools/ai.tools.js";
import { registerCampaignTools } from "./tools/campaigns.tools.js";
import { registerTemplateTools } from "./tools/templates.tools.js";
import { registerListTools } from "./tools/lists.tools.js";
import { registerTagTools } from "./tools/tags.tools.js";
import { registerOutreachTools } from "./tools/outreach.tools.js";
import { registerStatsTools } from "./tools/stats.tools.js";

// ─── Create Server ──────────────────────────────────────────────────────────

const server = new McpServer(
  {
    name: "advanscraper",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
    instructions: `AdvanScraper MCP Server — Lead generation, scraping, AI messaging, campaigns, and outreach management.

Available capabilities:
- Search, create, update, and delete leads
- Scrape leads from Google Maps, LinkedIn, Instagram, and Facebook
- Generate personalized AI messages (email, WhatsApp, LinkedIn, Instagram)
- Manage campaigns (create, send email campaigns)
- Manage message templates
- Manage lead lists and tags
- View outreach history
- Export leads to CSV
- View dashboard statistics

All operations are scoped to the authenticated user's data.`,
  }
);

// ─── Register All Tools ─────────────────────────────────────────────────────

registerLeadsTools(server);
registerScrapingTools(server);
registerAiTools(server);
registerCampaignTools(server);
registerTemplateTools(server);
registerListTools(server);
registerTagTools(server);
registerOutreachTools(server);
registerStatsTools(server);

// ─── Start Server ───────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("AdvanScraper MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
