import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { startScrape } from "@/lib/services/scraping.service";
import { ServiceError } from "@/lib/services/errors";

export const maxDuration = 15;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await request.json();
    const result = await startScrape(user.id, user.email ?? "", body);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("[scrape/start] Error:", error);
    const msg = error instanceof Error ? error.message : "Error interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
