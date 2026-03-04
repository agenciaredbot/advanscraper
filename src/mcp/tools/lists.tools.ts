/**
 * MCP Tools — Lead Lists
 */

import { z } from "zod/v4";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getMcpUser } from "../auth.js";
import {
  listLeadLists,
  getLeadList,
  createLeadList,
  updateLeadList,
  deleteLeadList,
  addLeadsToList,
  removeLeadsFromList,
} from "@/lib/services/lists.service";

export function registerListTools(server: McpServer) {
  // ─── List Lists ───────────────────────────────────────────────────────
  server.registerTool("advanscraper_list_lists", {
    title: "List Lead Lists",
    description: "List all lead lists with item counts.",
    inputSchema: {},
  }, async () => {
    const user = await getMcpUser();
    const lists = await listLeadLists(user.userId);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(lists, null, 2) }],
    };
  });

  // ─── Get List ─────────────────────────────────────────────────────────
  server.registerTool("advanscraper_get_list", {
    title: "Get Lead List",
    description: "Get a lead list with all its leads.",
    inputSchema: {
      listId: z.string().describe("The list ID"),
    },
  }, async (args) => {
    const user = await getMcpUser();
    const list = await getLeadList(user.userId, args.listId);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(list, null, 2) }],
    };
  });

  // ─── Create List ──────────────────────────────────────────────────────
  server.registerTool("advanscraper_create_list", {
    title: "Create Lead List",
    description: "Create a new lead list.",
    inputSchema: {
      name: z.string().describe("List name"),
      description: z.string().optional().describe("List description"),
      color: z.string().optional().describe("Color hex code (default #3B82F6)"),
    },
  }, async (args) => {
    const user = await getMcpUser();
    const list = await createLeadList(user.userId, args);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(list, null, 2) }],
    };
  });

  // ─── Update List ──────────────────────────────────────────────────────
  server.registerTool("advanscraper_update_list", {
    title: "Update Lead List",
    description: "Update a lead list's name, description, or color.",
    inputSchema: {
      listId: z.string().describe("The list ID to update"),
      name: z.string().optional(),
      description: z.string().optional(),
      color: z.string().optional(),
    },
  }, async (args) => {
    const user = await getMcpUser();
    const { listId, ...data } = args;
    const list = await updateLeadList(user.userId, listId, data);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(list, null, 2) }],
    };
  });

  // ─── Delete List ──────────────────────────────────────────────────────
  server.registerTool("advanscraper_delete_list", {
    title: "Delete Lead List",
    description: "Delete a lead list.",
    inputSchema: {
      listId: z.string().describe("The list ID to delete"),
    },
  }, async (args) => {
    const user = await getMcpUser();
    const result = await deleteLeadList(user.userId, args.listId);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  });

  // ─── Add Leads to List ────────────────────────────────────────────────
  server.registerTool("advanscraper_add_leads_to_list", {
    title: "Add Leads to List",
    description: "Add one or more leads to a list.",
    inputSchema: {
      listId: z.string().describe("The list ID"),
      leadIds: z.array(z.string()).describe("Array of lead IDs to add"),
    },
  }, async (args) => {
    const user = await getMcpUser();
    const result = await addLeadsToList(user.userId, args.listId, args.leadIds);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  });

  // ─── Remove Leads from List ───────────────────────────────────────────
  server.registerTool("advanscraper_remove_leads_from_list", {
    title: "Remove Leads from List",
    description: "Remove one or more leads from a list.",
    inputSchema: {
      listId: z.string().describe("The list ID"),
      leadIds: z.array(z.string()).describe("Array of lead IDs to remove"),
    },
  }, async (args) => {
    const user = await getMcpUser();
    const result = await removeLeadsFromList(user.userId, args.listId, args.leadIds);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  });
}
