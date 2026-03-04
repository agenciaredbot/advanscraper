import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";

// DELETE — Revoke an API key (session-based, for Settings UI)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const apiKey = await prisma.apiKey.findFirst({
      where: { id, userId: user.id },
    });

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key no encontrada" },
        { status: 404 }
      );
    }

    // Soft-delete by setting isActive = false
    await prisma.apiKey.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Revoke API key error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
