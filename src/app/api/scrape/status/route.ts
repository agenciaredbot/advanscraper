import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkScrapeStatus } from "@/lib/services/scraping.service";
import { ServiceError } from "@/lib/services/errors";

export const maxDuration = 30;

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const searchId = request.nextUrl.searchParams.get("searchId");
    if (!searchId) {
      return NextResponse.json({ error: "searchId requerido" }, { status: 400 });
    }

    const result = await checkScrapeStatus(user.id, user.email ?? "", searchId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("[scrape/status] Error:", error);
    const msg = error instanceof Error ? error.message : "Error interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
