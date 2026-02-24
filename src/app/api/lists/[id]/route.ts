import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";

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
    const list = await prisma.leadList.findFirst({
      where: { id, userId: user.id },
      include: {
        items: {
          include: {
            lead: true,
          },
          orderBy: { addedAt: "desc" },
        },
        _count: { select: { items: true } },
      },
    });

    if (!list) return NextResponse.json({ error: "Lista no encontrada" }, { status: 404 });
    return NextResponse.json(list);
  } catch (error) {
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
    const { name, description, color } = await request.json();

    const list = await prisma.leadList.findFirst({ where: { id, userId: user.id } });
    if (!list) return NextResponse.json({ error: "Lista no encontrada" }, { status: 404 });

    const updated = await prisma.leadList.update({
      where: { id },
      data: { name, description, color },
    });

    return NextResponse.json(updated);
  } catch (error) {
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
    const list = await prisma.leadList.findFirst({ where: { id, userId: user.id } });
    if (!list) return NextResponse.json({ error: "Lista no encontrada" }, { status: 404 });

    await prisma.leadList.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("List DELETE error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
