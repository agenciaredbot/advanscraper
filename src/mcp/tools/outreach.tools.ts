/**
 * MCP Tools — Outreach (Email, Outreach History)
 */

import { z } from "zod/v4";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getMcpUser } from "../auth.js";
import {
  sendEmail,
  listOutreachLogs,
} from "@/lib/services/outreach.service";
import { exportLeadsCSV } from "@/lib/services/exports.service";

export function registerOutreachTools(server: McpServer) {
  // ─── Send Email ───────────────────────────────────────────────────────
  server.registerTool("advanscraper_send_email", {
    title: "Send Email",
    description:
      "Send an email to a specific lead. Requires the lead to have an email address and Brevo API key to be configured.",
    inputSchema: {
      leadId: z.string().describe("The lead ID to email"),
      subject: z.string().describe("Email subject line"),
      message: z.string().describe("Email body text"),
      senderName: z.string().optional().describe("Custom sender name"),
      loomUrl: z.string().optional().describe("Optional Loom video URL to embed"),
    },
  }, async (args) => {
    const user = await getMcpUser();
    const result = await sendEmail(user.userId, args);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  });

  // ─── Outreach History ─────────────────────────────────────────────────
  server.registerTool("advanscraper_outreach_history", {
    title: "Outreach History",
    description: "View outreach activity history with optional channel filter.",
    inputSchema: {
      channel: z.string().optional().describe("Filter by channel: email, whatsapp, linkedin, instagram"),
      page: z.number().optional().default(1).describe("Page number"),
      limit: z.number().optional().default(20).describe("Results per page"),
    },
  }, async (args) => {
    const user = await getMcpUser();
    const result = await listOutreachLogs(
      user.userId,
      { channel: args.channel },
      { page: args.page, limit: args.limit }
    );
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  });

  // ─── Export Leads CSV ─────────────────────────────────────────────────
  server.registerTool("advanscraper_export_leads_csv", {
    title: "Export Leads CSV",
    description: "Export leads to CSV format. Returns the CSV content as text.",
    inputSchema: {
      leadIds: z.array(z.string()).optional().describe("Specific lead IDs to export (exports all if not provided)"),
      source: z.string().optional().describe("Filter by source"),
      searchId: z.string().optional().describe("Filter by search/scrape ID"),
    },
  }, async (args) => {
    const user = await getMcpUser();
    const result = await exportLeadsCSV(user.userId, args);
    return {
      content: [
        {
          type: "text" as const,
          text: `Exported ${result.totalLeads} leads to ${result.fileName}\n\n${result.csv}`,
        },
      ],
    };
  });
}
