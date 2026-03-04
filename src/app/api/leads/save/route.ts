import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { saveLeads, unsaveLeads } from "@/lib/services/leads.service";
import { ServiceError } from "@/lib/services/errors";

// POST — Bulk save leads (mark as saved)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { leadIds } = (await request.json()) as { leadIds?: string[] };
    const result = await saveLeads(user.id, leadIds || []);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Leads save error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// DELETE — Bulk unsave leads
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { leadIds } = (await request.json()) as { leadIds?: string[] };
    const result = await unsaveLeads(user.id, leadIds || []);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Leads unsave error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
