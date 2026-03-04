import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listLeadLists, createLeadList } from "@/lib/services/lists.service";
import { ServiceError } from "@/lib/services/errors";

// GET — List all lead lists
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const lists = await listLeadLists(user.id);
    return NextResponse.json(lists);
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Lists GET error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST — Create a new list
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await request.json();
    const list = await createLeadList(user.id, body);
    return NextResponse.json(list, { status: 201 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Lists POST error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
