import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getLeadIds } from "@/lib/services/leads.service";
import type { LeadFilters } from "@/lib/services/types";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const sp = request.nextUrl.searchParams;
    const filters: LeadFilters = {};

    if (sp.get("source")) filters.source = sp.get("source")!;
    if (sp.get("city")) filters.city = sp.get("city")!;
    if (sp.get("hasEmail") === "true") filters.hasEmail = true;
    if (sp.get("hasPhone") === "true") filters.hasPhone = true;
    if (sp.get("searchId")) filters.searchId = sp.get("searchId")!;
    if (sp.get("search")) filters.search = sp.get("search")!;
    if (sp.has("isSaved")) filters.isSaved = sp.get("isSaved") === "true";
    if (sp.get("tagId")) filters.tagId = sp.get("tagId")!;

    const ids = await getLeadIds(user.id, filters);
    return NextResponse.json({ ids });
  } catch (error) {
    console.error("Error fetching lead IDs:", error);
    return NextResponse.json({ error: "Error al obtener IDs" }, { status: 500 });
  }
}
