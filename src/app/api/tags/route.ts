import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";

// GET — List all tags for the user
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const tags = await prisma.leadTag.findMany({
      where: { userId: user.id },
      include: {
        _count: { select: { assignments: true } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(tags);
  } catch (error) {
    console.error("Tags GET error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// POST — Create a new tag
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { name, color } = (await request.json()) as {
      name?: string;
      color?: string;
    };

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: "El nombre es requerido" },
        { status: 400 }
      );
    }

    try {
      const tag = await prisma.leadTag.create({
        data: {
          userId: user.id,
          name: name.trim(),
          color: color || "#10B981",
        },
      });

      return NextResponse.json(tag);
    } catch {
      return NextResponse.json(
        { error: "Ya existe un tag con ese nombre" },
        { status: 409 }
      );
    }
  } catch (error) {
    console.error("Tag POST error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
