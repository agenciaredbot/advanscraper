import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { getLoomVideoMeta } from "@/lib/outreach/loom";

// GET — List saved Loom videos
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const videos = await prisma.loomVideo.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(videos);
  } catch (error) {
    console.error("Loom videos GET error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST — Add a Loom video by share URL
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { shareUrl, label } = await request.json();

    if (!shareUrl || !shareUrl.includes("loom.com/share/")) {
      return NextResponse.json(
        { error: "URL de Loom inválida. Debe ser como: https://www.loom.com/share/..." },
        { status: 400 }
      );
    }

    // Fetch metadata
    const meta = await getLoomVideoMeta(shareUrl);
    if (!meta) {
      return NextResponse.json(
        { error: "No se pudo obtener metadata del video" },
        { status: 400 }
      );
    }

    const video = await prisma.loomVideo.create({
      data: {
        userId: user.id,
        shareUrl,
        embedUrl: meta.embedUrl,
        title: meta.title,
        thumbnailUrl: meta.thumbnailUrl,
        duration: meta.duration,
        label: label || null,
      },
    });

    return NextResponse.json(video, { status: 201 });
  } catch (error) {
    console.error("Loom video POST error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// DELETE — Remove a Loom video
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    await prisma.loomVideo.deleteMany({
      where: { id, userId: user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Loom video DELETE error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
