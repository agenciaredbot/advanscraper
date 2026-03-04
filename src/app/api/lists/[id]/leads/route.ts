import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { addLeadsToList, removeLeadsFromList } from "@/lib/services/lists.service";
import { ServiceError } from "@/lib/services/errors";

// POST — Add leads to list
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id: listId } = await params;
    const { leadIds } = await request.json();
    const result = await addLeadsToList(user.id, listId, leadIds || []);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Add leads to list error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// DELETE — Remove leads from list
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id: listId } = await params;
    const { leadIds } = await request.json();
    const result = await removeLeadsFromList(user.id, listId, leadIds || []);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Remove leads from list error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
