import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { generateApiKey, hashApiKey } from "@/app/api/v1/_lib/auth";

// GET — List user's API keys (session-based, for Settings UI)
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const keys = await prisma.apiKey.findMany({
      where: { userId: user.id, isActive: true },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        lastUsedAt: true,
        createdAt: true,
        isActive: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ keys });
  } catch (error) {
    console.error("List API keys error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST — Create a new API key (session-based, for Settings UI)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { name } = await request.json();
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Nombre requerido" },
        { status: 400 }
      );
    }

    // Generate new key
    const { rawKey, keyHash, keyPrefix } = generateApiKey();

    // Store in DB
    await prisma.apiKey.create({
      data: {
        userId: user.id,
        name: name.trim(),
        keyHash,
        keyPrefix,
        scopes: [],
      },
    });

    // Return the raw key ONCE — it won't be stored or retrievable again
    return NextResponse.json(
      {
        rawKey,
        keyPrefix,
        message: "API key creada. Guarda el key — no se mostrara de nuevo.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create API key error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
