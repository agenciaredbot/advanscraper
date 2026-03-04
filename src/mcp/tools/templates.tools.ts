/**
 * MCP Tools — Message Templates
 */

import { z } from "zod/v4";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getMcpUser } from "../auth.js";
import {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "@/lib/services/templates.service";

export function registerTemplateTools(server: McpServer) {
  // ─── List Templates ───────────────────────────────────────────────────
  server.registerTool("advanscraper_list_templates", {
    title: "List Templates",
    description: "List all message templates.",
    inputSchema: {},
  }, async () => {
    const user = await getMcpUser();
    const templates = await listTemplates(user.userId);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(templates, null, 2) }],
    };
  });

  // ─── Get Template ─────────────────────────────────────────────────────
  server.registerTool("advanscraper_get_template", {
    title: "Get Template",
    description: "Get a specific message template by ID.",
    inputSchema: {
      templateId: z.string().describe("The template ID"),
    },
  }, async (args) => {
    const user = await getMcpUser();
    const template = await getTemplate(user.userId, args.templateId);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(template, null, 2) }],
    };
  });

  // ─── Create Template ──────────────────────────────────────────────────
  server.registerTool("advanscraper_create_template", {
    title: "Create Template",
    description: "Create a new message template.",
    inputSchema: {
      name: z.string().describe("Template name"),
      channel: z.enum(["email", "whatsapp", "linkedin", "instagram"]).describe("Channel"),
      subject: z.string().optional().describe("Email subject line"),
      bodyShort: z.string().optional().describe("Short body (for WhatsApp, DMs)"),
      bodyLong: z.string().describe("Full message body"),
      useAI: z.boolean().optional().describe("Enable AI personalization"),
      aiInstructions: z.string().optional().describe("AI instructions"),
    },
  }, async (args) => {
    const user = await getMcpUser();
    const template = await createTemplate(user.userId, args);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(template, null, 2) }],
    };
  });

  // ─── Update Template ──────────────────────────────────────────────────
  server.registerTool("advanscraper_update_template", {
    title: "Update Template",
    description: "Update an existing message template.",
    inputSchema: {
      templateId: z.string().describe("The template ID to update"),
      name: z.string().optional(),
      channel: z.enum(["email", "whatsapp", "linkedin", "instagram"]).optional(),
      subject: z.string().optional(),
      bodyShort: z.string().optional(),
      bodyLong: z.string().optional(),
      useAI: z.boolean().optional(),
      aiInstructions: z.string().optional(),
    },
  }, async (args) => {
    const user = await getMcpUser();
    const { templateId, ...data } = args;
    const template = await updateTemplate(user.userId, templateId, data);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(template, null, 2) }],
    };
  });

  // ─── Delete Template ──────────────────────────────────────────────────
  server.registerTool("advanscraper_delete_template", {
    title: "Delete Template",
    description: "Delete a message template.",
    inputSchema: {
      templateId: z.string().describe("The template ID to delete"),
    },
  }, async (args) => {
    const user = await getMcpUser();
    const result = await deleteTemplate(user.userId, args.templateId);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  });
}
