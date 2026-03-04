/**
 * MCP Tools — AI Message Generation
 */

import { z } from "zod/v4";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getMcpUser } from "../auth.js";
import {
  generateAIMessage,
  generateAIMessagesBulk,
} from "@/lib/services/ai.service";

export function registerAiTools(server: McpServer) {
  // ─── Generate Message ─────────────────────────────────────────────────
  server.registerTool("advanscraper_generate_message", {
    title: "Generate AI Message",
    description:
      "Generate a personalized outreach message using AI for a specific lead and channel.",
    inputSchema: {
      channel: z
        .enum(["email", "whatsapp", "linkedin", "instagram"])
        .describe("Communication channel"),
      lead: z
        .object({
          businessName: z.string().optional(),
          contactPerson: z.string().optional(),
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          industry: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          website: z.string().optional(),
          description: z.string().optional(),
        })
        .describe("Lead information for personalization"),
      templateBase: z.string().optional().describe("Template text to use as base for AI personalization"),
      instructions: z
        .string()
        .optional()
        .describe("Additional instructions for the AI (e.g., tone, focus, language)"),
    },
  }, async (args) => {
    const user = await getMcpUser();
    const result = await generateAIMessage(user.userId, user.email, {
      channel: args.channel,
      lead: args.lead,
      templateBase: args.templateBase,
      instructions: args.instructions,
    });
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  });

  // ─── Generate Messages Bulk ───────────────────────────────────────────
  server.registerTool("advanscraper_generate_messages_bulk", {
    title: "Generate AI Messages (Bulk)",
    description:
      "Generate personalized messages for multiple leads at once.",
    inputSchema: {
      channel: z
        .enum(["email", "whatsapp", "linkedin", "instagram"])
        .describe("Communication channel"),
      leads: z
        .array(
          z.object({
            businessName: z.string().optional(),
            contactPerson: z.string().optional(),
            firstName: z.string().optional(),
            lastName: z.string().optional(),
            industry: z.string().optional(),
            city: z.string().optional(),
            state: z.string().optional(),
            website: z.string().optional(),
            description: z.string().optional(),
          })
        )
        .describe("Array of leads to generate messages for"),
      templateBase: z.string().optional().describe("Template text to use as base"),
      instructions: z.string().optional().describe("AI instructions"),
    },
  }, async (args) => {
    const user = await getMcpUser();
    const results = await generateAIMessagesBulk(user.userId, user.email, {
      channel: args.channel,
      leads: args.leads,
      templateBase: args.templateBase,
      instructions: args.instructions,
    });
    return {
      content: [{ type: "text" as const, text: JSON.stringify(results, null, 2) }],
    };
  });
}
