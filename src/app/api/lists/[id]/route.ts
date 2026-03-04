import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getLeadList, updateLeadList, deleteLeadList } from "@/lib/services/lists.service";
import { ServiceError } from "@/lib/services/errors";

// GET — Get list with leads
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await params;
    const list = await getLeadList(user.id, id);
    return NextResponse.json(list);
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("List GET error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// PUT — Update list
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const updated = await updateLeadList(user.id, id, body);
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("List PUT error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// DELETE — Delete list
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await params;
    const result = await deleteLeadList(user.id, id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("List DELETE error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
