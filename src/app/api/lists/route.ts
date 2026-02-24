import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";

// GET — List all lead lists
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const lists = await prisma.leadList.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { items: true } },
      },
    });

    return NextResponse.json(lists);
  } catch (error) {
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

    const { name, description, color } = await request.json();
    if (!name) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

    const list = await prisma.leadList.create({
      data: {
        userId: user.id,
        name,
        description: description || null,
        color: color || "#3B82F6",
      },
    });

    return NextResponse.json(list, { status: 201 });
  } catch (error) {
    console.error("Lists POST error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
