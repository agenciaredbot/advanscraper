/**
 * MCP Tools — Tags
 */

import { z } from "zod/v4";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getMcpUser } from "../auth.js";
import {
  listTags,
  createTag,
  deleteTag,
} from "@/lib/services/tags.service";

export function registerTagTools(server: McpServer) {
  // ─── List Tags ────────────────────────────────────────────────────────
  server.registerTool("advanscraper_list_tags", {
    title: "List Tags",
    description: "List all tags with usage counts.",
    inputSchema: {},
  }, async () => {
    const user = await getMcpUser();
    const tags = await listTags(user.userId);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(tags, null, 2) }],
    };
  });

  // ─── Create Tag ───────────────────────────────────────────────────────
  server.registerTool("advanscraper_create_tag", {
    title: "Create Tag",
    description: "Create a new tag for organizing leads.",
    inputSchema: {
      name: z.string().describe("Tag name"),
      color: z.string().optional().describe("Tag color hex code (default #10B981)"),
    },
  }, async (args) => {
    const user = await getMcpUser();
    const tag = await createTag(user.userId, args);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(tag, null, 2) }],
    };
  });

  // ─── Delete Tag ───────────────────────────────────────────────────────
  server.registerTool("advanscraper_delete_tag", {
    title: "Delete Tag",
    description: "Delete a tag. This will remove it from all leads.",
    inputSchema: {
      tagId: z.string().describe("The tag ID to delete"),
    },
  }, async (args) => {
    const user = await getMcpUser();
    const result = await deleteTag(user.userId, args.tagId);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  });
}
