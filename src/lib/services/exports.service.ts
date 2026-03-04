/**
 * Exports Service — Generate CSV exports.
 */

import { prisma } from "@/lib/db";
import { generateCSV } from "@/lib/exports/csv-generator";
import { buildLeadWhereClause } from "./leads.service";
import { ValidationError } from "./errors";
import type { ExportCSVParams } from "./types";

// ─── Export Leads to CSV ─────────────────────────────────────────────────────

export async function exportLeadsCSV(
  userId: string,
  params: ExportCSVParams
): Promise<{ csv: string; fileName: string; totalLeads: number }> {
  let where: Record<string, unknown>;

  // If specific leadIds are provided, use them directly
  if (params.leadIds && params.leadIds.length > 0) {
    where = { userId, id: { in: params.leadIds } };
    if (params.searchId) where.searchId = params.searchId;
    if (params.source) where.source = params.source;
  } else {
    // Use shared where clause builder for filter-based exports
    where = buildLeadWhereClause(userId, {
      source: params.source,
      searchId: params.searchId,
      search: params.search,
      city: params.city,
      hasEmail: params.hasEmail,
      hasPhone: params.hasPhone,
      isSaved: params.isSaved,
      tagId: params.tagId,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leads = await prisma.lead.findMany({
    where: where as any,
    orderBy: { scrapedAt: "desc" },
  });

  if (leads.length === 0) {
    throw new ValidationError("No hay leads para exportar");
  }

  const csv = generateCSV(leads);
  const fileName = `leads-export-${new Date().toISOString().split("T")[0]}.csv`;

  // Log export
  await prisma.export.create({
    data: {
      userId,
      searchId: params.searchId || null,
      exportType: "csv",
      fileName,
      totalLeads: leads.length,
    },
  });

  return { csv, fileName, totalLeads: leads.length };
}
