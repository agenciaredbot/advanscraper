import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";

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

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ error: "leadIds requerido (array)" }, { status: 400 });
    }

    // Verify list belongs to user
    const list = await prisma.leadList.findFirst({ where: { id: listId, userId: user.id } });
    if (!list) return NextResponse.json({ error: "Lista no encontrada" }, { status: 404 });

    // Add leads (skip duplicates)
    let addedCount = 0;
    for (const leadId of leadIds) {
      try {
        await prisma.leadListItem.create({
          data: { leadId, listId },
        });
        addedCount++;
      } catch {
        // Duplicate — already in list
      }
    }

    return NextResponse.json({ success: true, addedCount });
  } catch (error) {
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

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ error: "leadIds requerido (array)" }, { status: 400 });
    }

    const list = await prisma.leadList.findFirst({ where: { id: listId, userId: user.id } });
    if (!list) return NextResponse.json({ error: "Lista no encontrada" }, { status: 404 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await prisma.leadListItem.deleteMany({
      where: {
        listId,
        leadId: { in: leadIds },
      } as any,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove leads from list error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
