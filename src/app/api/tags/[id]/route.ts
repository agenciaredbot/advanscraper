import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";

// PATCH — Update tag name/color
export async function PATCH(
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
    const { name, color } = (await request.json()) as {
      name?: string;
      color?: string;
    };

    const tag = await prisma.leadTag.findFirst({
      where: { id, userId: user.id },
    });

    if (!tag) {
      return NextResponse.json(
        { error: "Tag no encontrado" },
        { status: 404 }
      );
    }

    const data: Record<string, string> = {};
    if (name && name.trim().length > 0) data.name = name.trim();
    if (color) data.color = color;

    const updated = await prisma.leadTag.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Tag PATCH error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// DELETE — Delete tag (cascades to all assignments)
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

    const tag = await prisma.leadTag.findFirst({
      where: { id, userId: user.id },
    });

    if (!tag) {
      return NextResponse.json(
        { error: "Tag no encontrado" },
        { status: 404 }
      );
    }

    await prisma.leadTag.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Tag DELETE error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
