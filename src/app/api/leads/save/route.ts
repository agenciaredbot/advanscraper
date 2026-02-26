import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";

// POST — Bulk save leads (mark as saved)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { leadIds } = (await request.json()) as { leadIds?: string[] };

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json(
        { error: "Se requiere leadIds[]" },
        { status: 400 }
      );
    }

    const result = await prisma.lead.updateMany({
      where: { id: { in: leadIds }, userId: user.id },
      data: { isSaved: true, savedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      count: result.count,
      message: `${result.count} leads guardados`,
    });
  } catch (error) {
    console.error("Leads save error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// DELETE — Bulk unsave leads
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { leadIds } = (await request.json()) as { leadIds?: string[] };

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json(
        { error: "Se requiere leadIds[]" },
        { status: 400 }
      );
    }

    const result = await prisma.lead.updateMany({
      where: { id: { in: leadIds }, userId: user.id },
      data: { isSaved: false, savedAt: null },
    });

    return NextResponse.json({
      success: true,
      count: result.count,
      message: `${result.count} leads removidos`,
    });
  } catch (error) {
    console.error("Leads unsave error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
