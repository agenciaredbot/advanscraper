import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listOutreachLogs, logOutreach } from "@/lib/services/outreach.service";
import { ServiceError } from "@/lib/services/errors";

// GET — Outreach history
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(request.url);

    const result = await listOutreachLogs(
      user.id,
      { channel: searchParams.get("channel") || undefined },
      {
        page: parseInt(searchParams.get("page") || "1", 10),
        limit: parseInt(searchParams.get("limit") || "20", 10),
      }
    );

    return NextResponse.json({
      logs: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Outreach log GET error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST — Log a manual outreach action
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await request.json();
    const log = await logOutreach(user.id, body);
    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Outreach log POST error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
