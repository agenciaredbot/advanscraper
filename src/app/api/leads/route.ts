import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";

// ─── Types for lead creation ─────────────────────────────────────────────────

interface LeadInput {
  businessName?: string;
  contactPerson?: string;
  firstName?: string;
  lastName?: string;
  contactTitle?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  country?: string;
  category?: string;
  source?: string;
}

function cleanStr(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function sanitizeLead(raw: LeadInput) {
  // Auto-derive firstName/lastName from contactPerson if not provided
  const contactPerson = cleanStr(raw.contactPerson);
  let firstName = cleanStr(raw.firstName);
  let lastName = cleanStr(raw.lastName);
  if (!firstName && !lastName && contactPerson) {
    const parts = contactPerson.trim().split(/\s+/);
    firstName = parts[0] || null;
    lastName = parts.length > 1 ? parts.slice(1).join(" ") : null;
  }
  // Auto-derive contactPerson from firstName + lastName if not provided
  const derivedContactPerson = contactPerson || [firstName, lastName].filter(Boolean).join(" ") || null;

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
  };
}

// ─── POST — Create lead(s) (individual or bulk) ─────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { lead, leads } = body as { lead?: LeadInput; leads?: LeadInput[] };

    // ── Single lead creation ──
    if (lead) {
      const data = sanitizeLead(lead);
      if (!data.businessName && !data.contactPerson) {
        return NextResponse.json(
          { error: "Se requiere al menos un nombre de negocio o persona de contacto" },
          { status: 400 }
        );
      }

      const source = cleanStr(lead.source) || "manual";
      const created = await prisma.lead.create({
        data: {
          userId: user.id,
          source,
          ...data,
        },
      });

      return NextResponse.json({ success: true, created: 1, lead: created });
    }

    // ── Bulk creation (CSV/Excel import) ──
    if (leads && Array.isArray(leads)) {
      if (leads.length === 0) {
        return NextResponse.json({ error: "No hay leads para importar" }, { status: 400 });
      }
      if (leads.length > 500) {
        return NextResponse.json(
          { error: "Máximo 500 leads por importación" },
          { status: 400 }
        );
      }

      const source = cleanStr(leads[0]?.source) || "csv_import";
      let created = 0;
      let skipped = 0;

      // Use individual creates with try/catch to handle duplicates gracefully
      for (const rawLead of leads) {
        const data = sanitizeLead(rawLead);
        // Skip only completely empty rows (no field has any value)
        const hasAnyField = Object.values(data).some((v) => v !== null);
        if (!hasAnyField) {
          skipped++;
          continue;
        }
        try {
          await prisma.lead.create({
            data: {
              userId: user.id,
              source,
              ...data,
            },
          });
          created++;
        } catch {
          skipped++; // Duplicate or validation error
        }
      }

      return NextResponse.json({
        success: true,
        created,
        skipped,
        total: leads.length,
        message: `${created} leads importados${skipped > 0 ? `, ${skipped} omitidos` : ""}`,
      });
    }

    return NextResponse.json(
      { error: "Se requiere 'lead' o 'leads' en el body" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Leads POST error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// GET — List leads with pagination and filters
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const source = searchParams.get("source");
    const city = searchParams.get("city");
    const hasEmail = searchParams.get("hasEmail");
    const hasPhone = searchParams.get("hasPhone");
    const searchId = searchParams.get("searchId");
    const search = searchParams.get("search");
    const isSaved = searchParams.get("isSaved");
    const tagId = searchParams.get("tagId");

    // Build where clause
    const where: Record<string, unknown> = { userId: user.id };
    if (source) where.source = source;
    if (city) where.city = { contains: city, mode: "insensitive" };
    if (hasEmail === "true") where.email = { not: null };
    if (hasPhone === "true") where.phone = { not: null };
    if (searchId) where.searchId = searchId;
    if (isSaved === "true") where.isSaved = true;
    if (isSaved === "false") where.isSaved = false;
    if (tagId) where.tags = { some: { tagId } };
    if (search) {
      where.OR = [
        { businessName: { contains: search, mode: "insensitive" } },
        { contactPerson: { contains: search, mode: "insensitive" } },
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
      ];
    }

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
      prisma.lead.count({
        where: where as any,
      }),
    ]);

    return NextResponse.json({
      leads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Leads GET error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
