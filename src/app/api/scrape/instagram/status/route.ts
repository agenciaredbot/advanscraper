import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkInstagramService } from "@/lib/scrapers/instagram";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const online = await checkInstagramService();
  return NextResponse.json({ online });
}
