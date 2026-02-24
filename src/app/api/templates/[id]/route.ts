import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";

// PUT — Update template
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await params;
    const template = await prisma.messageTemplate.findFirst({ where: { id, userId: user.id } });
    if (!template) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const body = await request.json();
    const updated = await prisma.messageTemplate.update({
      where: { id },
      data: {
        name: body.name,
        channel: body.channel,
        subject: body.subject,
        bodyShort: body.bodyShort,
        bodyLong: body.bodyLong,
        useAI: body.useAI,
        aiInstructions: body.aiInstructions,
        includeVideo: body.includeVideo,
        videoType: body.videoType,
        videoId: body.videoId,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Template PUT error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// DELETE — Delete template
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await params;
    const template = await prisma.messageTemplate.findFirst({ where: { id, userId: user.id } });
    if (!template) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    await prisma.messageTemplate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Template DELETE error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
