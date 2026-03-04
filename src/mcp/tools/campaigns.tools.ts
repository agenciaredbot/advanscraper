/**
 * MCP Tools — Campaigns
 */

import { z } from "zod/v4";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getMcpUser } from "../auth.js";
import {
  listCampaigns,
  getCampaign,
  createCampaign,
  deleteCampaign,
  sendCampaign,
} from "@/lib/services/campaigns.service";

export function registerCampaignTools(server: McpServer) {
  // ─── List Campaigns ───────────────────────────────────────────────────
  server.registerTool("advanscraper_list_campaigns", {
    title: "List Campaigns",
    description: "List all campaigns for the authenticated user.",
    inputSchema: {},
  }, async () => {
    const user = await getMcpUser();
    const campaigns = await listCampaigns(user.userId);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(campaigns, null, 2) }],
    };
  });

  // ─── Get Campaign ─────────────────────────────────────────────────────
  server.registerTool("advanscraper_get_campaign", {
    title: "Get Campaign",
    description: "Get detailed information about a specific campaign.",
    inputSchema: {
      campaignId: z.string().describe("The campaign ID"),
    },
  }, async (args) => {
    const user = await getMcpUser();
    const campaign = await getCampaign(user.userId, args.campaignId);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(campaign, null, 2) }],
    };
  });

  // ─── Create Campaign ──────────────────────────────────────────────────
  server.registerTool("advanscraper_create_campaign", {
    title: "Create Campaign",
    description: "Create a new outreach campaign.",
    inputSchema: {
      name: z.string().describe("Campaign name"),
      channel: z.enum(["email", "whatsapp", "linkedin", "instagram"]).describe("Channel"),
      templateId: z.string().optional().describe("Template ID to use"),
      leadIds: z.array(z.string()).optional().describe("Specific lead IDs to include"),
      listId: z.string().optional().describe("List ID to pull leads from (used if leadIds is empty)"),
      useAI: z.boolean().optional().describe("Use AI to personalize messages"),
      aiInstructions: z.string().optional().describe("AI personalization instructions"),
    },
  }, async (args) => {
    const user = await getMcpUser();
    const campaign = await createCampaign(user.userId, args);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(campaign, null, 2) }],
    };
  });

  // ─── Delete Campaign ──────────────────────────────────────────────────
  server.registerTool("advanscraper_delete_campaign", {
    title: "Delete Campaign",
    description: "Delete a campaign.",
    inputSchema: {
      campaignId: z.string().describe("The campaign ID to delete"),
    },
  }, async (args) => {
    const user = await getMcpUser();
    const result = await deleteCampaign(user.userId, args.campaignId);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  });

  // ─── Send Campaign ────────────────────────────────────────────────────
  server.registerTool("advanscraper_send_campaign", {
    title: "Send Campaign",
    description:
      "Send a campaign. Currently supports email campaigns. The campaign must be in 'draft' or 'paused' status.",
    inputSchema: {
      campaignId: z.string().describe("The campaign ID to send"),
    },
  }, async (args) => {
    const user = await getMcpUser();
    const result = await sendCampaign(user.userId, user.email, args.campaignId);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  });
}
