import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";

// POST — Assign tags to a lead
export async function POST(
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
    const body = (await request.json()) as {
      tagIds?: string[];
      tagName?: string;
      color?: string;
    };

    // Verify lead belongs to user
    const lead = await prisma.lead.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });

    if (!lead) {
      return NextResponse.json(
        { error: "Lead no encontrado" },
        { status: 404 }
      );
    }

    // Option 1: Assign existing tags by ID
    if (body.tagIds && body.tagIds.length > 0) {
      const assignments = body.tagIds.map((tagId) => ({
        leadId: id,
        tagId,
      }));

      await prisma.leadTagAssignment.createMany({
        data: assignments,
        skipDuplicates: true,
      });

      return NextResponse.json({ success: true });
    }

    // Option 2: Create-and-assign a new tag by name
    if (body.tagName && body.tagName.trim().length > 0) {
      const name = body.tagName.trim();
      const color = body.color || "#10B981";

      // Find or create the tag
      let tag = await prisma.leadTag.findFirst({
        where: { userId: user.id, name },
      });

      if (!tag) {
        tag = await prisma.leadTag.create({
          data: { userId: user.id, name, color },
        });
      }

      // Assign to lead
      await prisma.leadTagAssignment.upsert({
        where: { leadId_tagId: { leadId: id, tagId: tag.id } },
        create: { leadId: id, tagId: tag.id },
        update: {},
      });

      return NextResponse.json({ success: true, tag });
    }

    return NextResponse.json(
      { error: "Se requiere tagIds[] o tagName" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Tags assign error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// DELETE — Remove tags from a lead
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
    const { tagIds } = (await request.json()) as { tagIds?: string[] };

    if (!tagIds || tagIds.length === 0) {
      return NextResponse.json(
        { error: "Se requiere tagIds[]" },
        { status: 400 }
      );
    }

    await prisma.leadTagAssignment.deleteMany({
      where: {
        leadId: id,
        tagId: { in: tagIds },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Tags remove error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
