import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";

// GET — List templates
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const templates = await prisma.messageTemplate.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error("Templates GET error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST — Create template
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await request.json();
    const { name, channel, subject, bodyShort, bodyLong, useAI, aiInstructions } = body;

    if (!name || !channel || !bodyLong) {
      return NextResponse.json(
        { error: "name, channel y bodyLong son obligatorios" },
        { status: 400 }
      );
    }

    const template = await prisma.messageTemplate.create({
      data: {
        userId: user.id,
        name,
        channel,
        subject: subject || null,
        bodyShort: bodyShort || null,
        bodyLong,
        useAI: useAI || false,
        aiInstructions: aiInstructions || null,
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("Template POST error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
