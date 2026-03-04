/**
 * MCP Tools — Dashboard Stats
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getMcpUser } from "../auth.js";
import { getDashboardStats } from "@/lib/services/stats.service";

export function registerStatsTools(server: McpServer) {
  // ─── Get Stats ────────────────────────────────────────────────────────
  server.registerTool("advanscraper_get_stats", {
    title: "Get Dashboard Stats",
    description:
      "Get dashboard statistics: total leads, leads today, emails sent, campaigns active, top sources, recent activity, and more.",
    inputSchema: {},
  }, async () => {
    const user = await getMcpUser();
    const stats = await getDashboardStats(user.userId);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(stats, null, 2) }],
    };
  });
}
