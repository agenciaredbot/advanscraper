import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateTag, deleteTag } from "@/lib/services/tags.service";
import { ServiceError } from "@/lib/services/errors";

// PATCH — Update tag name/color
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const updated = await updateTag(user.id, id, body);
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Tag PATCH error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// DELETE — Delete tag (cascades to all assignments)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await params;
    const result = await deleteTag(user.id, id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Tag DELETE error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
