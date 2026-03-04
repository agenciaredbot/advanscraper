/**
 * Leads Service — CRUD operations for leads.
 * All functions receive userId (already authenticated) and return typed data.
 */

import { prisma } from "@/lib/db";
import { NotFoundError, ValidationError } from "./errors";
import type {
  LeadInput,
  LeadFilters,
  LeadUpdateData,
  PaginationParams,
  PaginatedResult,
  BulkCreateResult,
} from "./types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cleanStr(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function sanitizeLead(raw: LeadInput) {
  const contactPerson = cleanStr(raw.contactPerson);
  let firstName = cleanStr(raw.firstName);
  let lastName = cleanStr(raw.lastName);
  if (!firstName && !lastName && contactPerson) {
    const parts = contactPerson.trim().split(/\s+/);
    firstName = parts[0] || null;
    lastName = parts.length > 1 ? parts.slice(1).join(" ") : null;
  }
  const derivedContactPerson =
    contactPerson || [firstName, lastName].filter(Boolean).join(" ") || null;

  return {
    businessName: cleanStr(raw.businessName),
    contactPerson: derivedContactPerson,
    firstName,
    lastName,
    contactTitle: cleanStr(raw.contactTitle),
    email: cleanStr(raw.email),
    phone: cleanStr(raw.phone),
    website: cleanStr(raw.website),
    address: cleanStr(raw.address),
    city: cleanStr(raw.city),
    country: cleanStr(raw.country),
    category: cleanStr(raw.category),
    state: cleanStr(raw.state),
    industry: cleanStr(raw.industry),
    profileUrl: cleanStr(raw.profileUrl),
    linkedinUrl: cleanStr(raw.linkedinUrl),
    googleMapsUrl: cleanStr(raw.googleMapsUrl),
  };
}

// ─── Where Clause Builder (shared) ──────────────────────────────────────────

export function buildLeadWhereClause(
  userId: string,
  filters: LeadFilters = {}
): Record<string, unknown> {
  const where: Record<string, unknown> = { userId };
  if (filters.source) where.source = filters.source;
  if (filters.city) where.city = { contains: filters.city, mode: "insensitive" };
  if (filters.hasEmail) where.email = { not: null };
  if (filters.hasPhone) where.phone = { not: null };
  if (filters.searchId) where.searchId = filters.searchId;
  if (filters.isSaved !== undefined) where.isSaved = filters.isSaved;
  if (filters.tagId) where.tags = { some: { tagId: filters.tagId } };
  if (filters.search) {
    where.OR = [
      { businessName: { contains: filters.search, mode: "insensitive" } },
      { contactPerson: { contains: filters.search, mode: "insensitive" } },
      { firstName: { contains: filters.search, mode: "insensitive" } },
      { lastName: { contains: filters.search, mode: "insensitive" } },
      { email: { contains: filters.search, mode: "insensitive" } },
      { category: { contains: filters.search, mode: "insensitive" } },
      { industry: { contains: filters.search, mode: "insensitive" } },
    ];
  }
  return where;
}

// ─── List Leads ──────────────────────────────────────────────────────────────

export async function listLeads(
  userId: string,
  filters: LeadFilters = {},
  pagination: PaginationParams = {}
): Promise<PaginatedResult<unknown>> {
  const page = pagination.page || 1;
  const limit = pagination.limit || 20;
  const where = buildLeadWhereClause(userId, filters);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where: where as any,
      orderBy: { scrapedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        listItems: {
          include: {
            list: { select: { id: true, name: true, color: true } },
          },
        },
        tags: {
          include: {
            tag: { select: { id: true, name: true, color: true } },
          },
        },
      },
    }),
    prisma.lead.count({ where: where as any }),
  ]);

  return {
    data: leads,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ─── Get Lead IDs (lightweight) ─────────────────────────────────────────────

export async function getLeadIds(
  userId: string,
  filters: LeadFilters = {}
): Promise<string[]> {
  const where = buildLeadWhereClause(userId, filters);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leads = await prisma.lead.findMany({
    where: where as any,
    select: { id: true },
    orderBy: { scrapedAt: "desc" },
  });

  return leads.map((l) => l.id);
}

// ─── Get Single Lead ─────────────────────────────────────────────────────────

export async function getLead(userId: string, leadId: string) {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, userId },
    include: {
      search: { select: { query: true, source: true } },
      outreachLogs: {
        orderBy: { sentAt: "desc" },
        take: 20,
      },
      listItems: {
        include: {
          list: { select: { id: true, name: true, color: true } },
        },
      },
      tags: {
        include: {
          tag: { select: { id: true, name: true, color: true } },
        },
      },
      notes: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!lead) throw new NotFoundError("Lead");
  return lead;
}

// ─── Create Single Lead ─────────────────────────────────────────────────────

export async function createLead(userId: string, input: LeadInput) {
  const data = sanitizeLead(input);
  if (!data.businessName && !data.contactPerson) {
    throw new ValidationError(
      "Se requiere al menos un nombre de negocio o persona de contacto"
    );
  }

  const source = cleanStr(input.source) || "manual";
  const created = await prisma.lead.create({
    data: { userId, source, ...data },
  });

  return created;
}

// ─── Create Leads Bulk ──────────────────────────────────────────────────────

export async function createLeadsBulk(
  userId: string,
  leads: LeadInput[]
): Promise<BulkCreateResult> {
  if (leads.length === 0) {
    throw new ValidationError("No hay leads para importar");
  }
  if (leads.length > 500) {
    throw new ValidationError("Maximo 500 leads por importacion");
  }

  const source = cleanStr(leads[0]?.source) || "csv_import";

  const validLeads = leads
    .map((rawLead) => {
      const data = sanitizeLead(rawLead);
      const hasAnyField = Object.values(data).some((v) => v !== null);
      return hasAnyField ? { userId, source, ...data } : null;
    })
    .filter((d): d is NonNullable<typeof d> => d !== null);

  const skippedEmpty = leads.length - validLeads.length;

  if (validLeads.length === 0) {
    return {
      created: 0,
      skipped: leads.length,
      total: leads.length,
      message: "No se encontraron datos validos para importar",
    };
  }

  const result = await prisma.lead.createMany({
    data: validLeads,
    skipDuplicates: true,
  });

  const created = result.count;
  const skipped = skippedEmpty + (validLeads.length - created);

  return {
    created,
    skipped,
    total: leads.length,
    message: `${created} leads importados${skipped > 0 ? `, ${skipped} omitidos` : ""}`,
  };
}

// ─── Update Lead ─────────────────────────────────────────────────────────────

const ALLOWED_UPDATE_FIELDS = [
  "businessName", "contactPerson", "firstName", "lastName", "contactTitle",
  "email", "phone", "website", "address", "city", "country", "category",
  "bio", "profileUrl", "state", "industry", "linkedinUrl", "googleMapsUrl",
] as const;

export async function updateLead(
  userId: string,
  leadId: string,
  body: Record<string, unknown>
) {
  const existing = await prisma.lead.findFirst({
    where: { id: leadId, userId },
  });
  if (!existing) throw new NotFoundError("Lead");

  const data: Record<string, string | null> = {};
  for (const field of ALLOWED_UPDATE_FIELDS) {
    if (field in body) {
      const val = body[field];
      data[field] =
        typeof val === "string" && val.trim().length > 0 ? val.trim() : null;
    }
  }

  if (Object.keys(data).length === 0) {
    throw new ValidationError("No hay campos para actualizar");
  }

  const updated = await prisma.lead.update({
    where: { id: leadId },
    data,
  });

  return updated;
}

// ─── Delete Lead ─────────────────────────────────────────────────────────────

export async function deleteLead(userId: string, leadId: string) {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, userId },
  });
  if (!lead) throw new NotFoundError("Lead");

  await prisma.lead.delete({ where: { id: leadId } });
  return { success: true };
}

// ─── Save / Unsave Leads ─────────────────────────────────────────────────────

export async function saveLeads(userId: string, leadIds: string[]) {
  if (!leadIds || leadIds.length === 0) {
    throw new ValidationError("Se requiere leadIds[]");
  }

  const result = await prisma.lead.updateMany({
    where: { id: { in: leadIds }, userId },
    data: { isSaved: true, savedAt: new Date() },
  });

  return { count: result.count, message: `${result.count} leads guardados` };
}

export async function unsaveLeads(userId: string, leadIds: string[]) {
  if (!leadIds || leadIds.length === 0) {
    throw new ValidationError("Se requiere leadIds[]");
  }

  const result = await prisma.lead.updateMany({
    where: { id: { in: leadIds }, userId },
    data: { isSaved: false, savedAt: null },
  });

  return { count: result.count, message: `${result.count} leads removidos` };
}

// ─── Notes ───────────────────────────────────────────────────────────────────

export async function listNotes(userId: string, leadId: string) {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, userId },
    select: { id: true },
  });
  if (!lead) throw new NotFoundError("Lead");

  return prisma.leadNote.findMany({
    where: { leadId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createNote(
  userId: string,
  leadId: string,
  content: string
) {
  if (!content || content.trim().length === 0) {
    throw new ValidationError("El contenido es requerido");
  }

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, userId },
    select: { id: true },
  });
  if (!lead) throw new NotFoundError("Lead");

  return prisma.leadNote.create({
    data: { leadId, userId, content: content.trim() },
  });
}

export async function updateNote(
  userId: string,
  noteId: string,
  content: string
) {
  if (!content || content.trim().length === 0) {
    throw new ValidationError("El contenido es requerido");
  }

  const note = await prisma.leadNote.findFirst({
    where: { id: noteId, userId },
  });
  if (!note) throw new NotFoundError("Nota");

  return prisma.leadNote.update({
    where: { id: noteId },
    data: { content: content.trim() },
  });
}

export async function deleteNote(userId: string, noteId: string) {
  const note = await prisma.leadNote.findFirst({
    where: { id: noteId, userId },
  });
  if (!note) throw new NotFoundError("Nota");

  await prisma.leadNote.delete({ where: { id: noteId } });
  return { success: true };
}

// ─── Tags Assignment ─────────────────────────────────────────────────────────

export async function assignTags(
  userId: string,
  leadId: string,
  params: { tagIds?: string[]; tagName?: string; color?: string }
) {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, userId },
    select: { id: true },
  });
  if (!lead) throw new NotFoundError("Lead");

  // Option 1: Assign existing tags by ID
  if (params.tagIds && params.tagIds.length > 0) {
    await prisma.leadTagAssignment.createMany({
      data: params.tagIds.map((tagId) => ({ leadId, tagId })),
      skipDuplicates: true,
    });
    return { success: true };
  }

  // Option 2: Create-and-assign by name
  if (params.tagName && params.tagName.trim().length > 0) {
    const name = params.tagName.trim();
    const color = params.color || "#10B981";

    let tag = await prisma.leadTag.findFirst({
      where: { userId, name },
    });

    if (!tag) {
      tag = await prisma.leadTag.create({
        data: { userId, name, color },
      });
    }

    await prisma.leadTagAssignment.upsert({
      where: { leadId_tagId: { leadId, tagId: tag.id } },
      create: { leadId, tagId: tag.id },
      update: {},
    });

    return { success: true, tag };
  }

  throw new ValidationError("Se requiere tagIds[] o tagName");
}

export async function removeTags(
  userId: string,
  leadId: string,
  tagIds: string[]
) {
  if (!tagIds || tagIds.length === 0) {
    throw new ValidationError("Se requiere tagIds[]");
  }

  await prisma.leadTagAssignment.deleteMany({
    where: { leadId, tagId: { in: tagIds } },
  });

  return { success: true };
}
