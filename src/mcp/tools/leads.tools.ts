/**
 * MCP Tools — Leads management
 */

import { z } from "zod/v4";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getMcpUser } from "../auth.js";
import {
  listLeads,
  getLead,
  createLead,
  createLeadsBulk,
  updateLead,
  deleteLead,
  saveLeads,
  unsaveLeads,
  listNotes,
  createNote,
  assignTags,
  removeTags,
} from "@/lib/services/leads.service";

export function registerLeadsTools(server: McpServer) {
  // ─── Search Leads ─────────────────────────────────────────────────────
  server.registerTool("advanscraper_search_leads", {
    title: "Search Leads",
    description:
      "Search and filter leads with pagination. Supports filters by source, city, email/phone presence, search text, saved status, and tag.",
    inputSchema: {
      source: z.string().optional().describe("Filter by source: google_maps, linkedin, instagram, facebook"),
      city: z.string().optional().describe("Filter by city"),
      hasEmail: z.boolean().optional().describe("Filter leads that have email"),
      hasPhone: z.boolean().optional().describe("Filter leads that have phone"),
      search: z.string().optional().describe("Full-text search across name, business, email, etc."),
      searchId: z.string().optional().describe("Filter by scrape search ID"),
      isSaved: z.boolean().optional().describe("Filter saved/unsaved leads"),
      tagId: z.string().optional().describe("Filter by tag ID"),
      page: z.number().optional().default(1).describe("Page number"),
      limit: z.number().optional().default(20).describe("Results per page (max 100)"),
    },
  }, async (args) => {
    const user = await getMcpUser();
    const result = await listLeads(
      user.userId,
      {
        source: args.source,
        city: args.city,
        hasEmail: args.hasEmail,
        hasPhone: args.hasPhone,
        search: args.search,
        searchId: args.searchId,
        isSaved: args.isSaved,
        tagId: args.tagId,
      },
      { page: args.page, limit: args.limit }
    );
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  });

  // ─── Get Lead ─────────────────────────────────────────────────────────
  server.registerTool("advanscraper_get_lead", {
    title: "Get Lead",
    description: "Get detailed information about a specific lead by ID.",
    inputSchema: {
      leadId: z.string().describe("The lead ID"),
    },
  }, async (args) => {
    const user = await getMcpUser();
    const lead = await getLead(user.userId, args.leadId);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(lead, null, 2) }],
    };
  });

  // ─── Create Lead ──────────────────────────────────────────────────────
  server.registerTool("advanscraper_create_lead", {
    title: "Create Lead",
    description: "Create a new lead manually.",
    inputSchema: {
      businessName: z.string().optional().describe("Business name"),
      contactPerson: z.string().optional().describe("Contact person name"),
      firstName: z.string().optional().describe("First name"),
      lastName: z.string().optional().describe("Last name"),
      email: z.string().optional().describe("Email address"),
      phone: z.string().optional().describe("Phone number"),
      website: z.string().optional().describe("Website URL"),
      city: z.string().optional().describe("City"),
      state: z.string().optional().describe("State/Region"),
      country: z.string().optional().describe("Country"),
      industry: z.string().optional().describe("Industry"),
      source: z.string().optional().describe("Lead source"),
      linkedinUrl: z.string().optional().describe("LinkedIn profile URL"),
      instagramUrl: z.string().optional().describe("Instagram profile URL"),
      facebookUrl: z.string().optional().describe("Facebook page URL"),
      googleMapsUrl: z.string().optional().describe("Google Maps URL"),
    },
  }, async (args) => {
    const user = await getMcpUser();
    const lead = await createLead(user.userId, args);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(lead, null, 2) }],
    };
  });

  // ─── Import Leads (Bulk) ──────────────────────────────────────────────
  server.registerTool("advanscraper_import_leads", {
    title: "Import Leads",
    description: "Import multiple leads at once (bulk create).",
    inputSchema: {
      leads: z.array(z.object({
        businessName: z.string().optional(),
        contactPerson: z.string().optional(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        website: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        country: z.string().optional(),
        industry: z.string().optional(),
        source: z.string().optional(),
      })).describe("Array of lead objects to import"),
    },
  }, async (args) => {
    const user = await getMcpUser();
    const result = await createLeadsBulk(user.userId, args.leads);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  });

  // ─── Update Lead ──────────────────────────────────────────────────────
  server.registerTool("advanscraper_update_lead", {
    title: "Update Lead",
    description: "Update an existing lead's information.",
    inputSchema: {
      leadId: z.string().describe("The lead ID to update"),
      businessName: z.string().optional(),
      contactPerson: z.string().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      website: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      industry: z.string().optional(),
      status: z.string().optional().describe("Lead status: new, contacted, qualified, converted, lost"),
    },
  }, async (args) => {
    const user = await getMcpUser();
    const { leadId, ...data } = args;
    const lead = await updateLead(user.userId, leadId, data);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(lead, null, 2) }],
    };
  });

  // ─── Delete Lead ──────────────────────────────────────────────────────
  server.registerTool("advanscraper_delete_lead", {
    title: "Delete Lead",
    description: "Delete a lead by ID.",
    inputSchema: {
      leadId: z.string().describe("The lead ID to delete"),
    },
  }, async (args) => {
    const user = await getMcpUser();
    const result = await deleteLead(user.userId, args.leadId);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  });

  // ─── Save Lead ────────────────────────────────────────────────────────
  server.registerTool("advanscraper_save_leads", {
    title: "Save Leads",
    description: "Mark leads as saved (bookmarked).",
    inputSchema: {
      leadIds: z.array(z.string()).describe("Array of lead IDs to save"),
    },
  }, async (args) => {
    const user = await getMcpUser();
    const result = await saveLeads(user.userId, args.leadIds);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  });

  // ─── Unsave Lead ──────────────────────────────────────────────────────
  server.registerTool("advanscraper_unsave_leads", {
    title: "Unsave Leads",
    description: "Remove saved status from leads.",
    inputSchema: {
      leadIds: z.array(z.string()).describe("Array of lead IDs to unsave"),
    },
  }, async (args) => {
    const user = await getMcpUser();
    const result = await unsaveLeads(user.userId, args.leadIds);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  });

  // ─── List Notes ───────────────────────────────────────────────────────
  server.registerTool("advanscraper_list_notes", {
    title: "List Lead Notes",
    description: "Get all notes for a specific lead.",
    inputSchema: {
      leadId: z.string().describe("The lead ID"),
    },
  }, async (args) => {
    const user = await getMcpUser();
    const notes = await listNotes(user.userId, args.leadId);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(notes, null, 2) }],
    };
  });

  // ─── Create Note ──────────────────────────────────────────────────────
  server.registerTool("advanscraper_create_note", {
    title: "Create Lead Note",
    description: "Add a note to a lead.",
    inputSchema: {
      leadId: z.string().describe("The lead ID"),
      content: z.string().describe("Note content text"),
    },
  }, async (args) => {
    const user = await getMcpUser();
    const note = await createNote(user.userId, args.leadId, args.content);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(note, null, 2) }],
    };
  });

  // ─── Assign Tags ──────────────────────────────────────────────────────
  server.registerTool("advanscraper_assign_tag", {
    title: "Assign Tag to Lead",
    description: "Assign tags to a lead. Provide tagIds to assign existing tags, or tagName to create and assign a new tag.",
    inputSchema: {
      leadId: z.string().describe("The lead ID"),
      tagIds: z.array(z.string()).optional().describe("Array of existing tag IDs to assign"),
      tagName: z.string().optional().describe("Name of a new tag to create and assign"),
      color: z.string().optional().describe("Color for the new tag (hex code)"),
    },
  }, async (args) => {
    const user = await getMcpUser();
    const { leadId, ...params } = args;
    const result = await assignTags(user.userId, leadId, params);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  });

  // ─── Remove Tags ──────────────────────────────────────────────────────
  server.registerTool("advanscraper_remove_tag", {
    title: "Remove Tag from Lead",
    description: "Remove one or more tags from a lead.",
    inputSchema: {
      leadId: z.string().describe("The lead ID"),
      tagIds: z.array(z.string()).describe("Array of tag IDs to remove"),
    },
  }, async (args) => {
    const user = await getMcpUser();
    const result = await removeTags(user.userId, args.leadId, args.tagIds);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  });
}
