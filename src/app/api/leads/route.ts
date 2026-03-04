import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  listLeads,
  createLead,
  createLeadsBulk,
} from "@/lib/services/leads.service";
import { ServiceError } from "@/lib/services/errors";

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
    const { lead, leads } = body;

    // ── Single lead creation ──
    if (lead) {
      const created = await createLead(user.id, lead);
      return NextResponse.json({ success: true, created: 1, lead: created });
    }

    // ── Bulk creation (CSV/Excel import) ──
    if (leads && Array.isArray(leads)) {
      const result = await createLeadsBulk(user.id, leads);
      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json(
      { error: "Se requiere 'lead' o 'leads' en el body" },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
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

    const result = await listLeads(
      user.id,
      {
        source: searchParams.get("source") || undefined,
        city: searchParams.get("city") || undefined,
        hasEmail: searchParams.get("hasEmail") === "true" ? true : undefined,
        hasPhone: searchParams.get("hasPhone") === "true" ? true : undefined,
        searchId: searchParams.get("searchId") || undefined,
        search: searchParams.get("search") || undefined,
        isSaved:
          searchParams.get("isSaved") === "true"
            ? true
            : searchParams.get("isSaved") === "false"
              ? false
              : undefined,
        tagId: searchParams.get("tagId") || undefined,
      },
      {
        page: parseInt(searchParams.get("page") || "1", 10),
        limit: parseInt(searchParams.get("limit") || "20", 10),
      }
    );

    return NextResponse.json({
      leads: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Leads GET error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
