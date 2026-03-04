import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDashboardStats } from "@/lib/services/stats.service";
import { ServiceError } from "@/lib/services/errors";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const stats = await getDashboardStats(user.id);
    return NextResponse.json(stats);
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Dashboard stats error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
