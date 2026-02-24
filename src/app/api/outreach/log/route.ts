import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";

// GET — Outreach history
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const channel = searchParams.get("channel");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { userId: user.id };
    if (channel) where.channel = channel;

    const [logs, total] = await Promise.all([
      prisma.outreachLog.findMany({
        where,
        orderBy: { sentAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          lead: {
            select: { businessName: true, contactPerson: true, email: true, profileUrl: true },
          },
        },
      }),
      prisma.outreachLog.count({ where }),
    ]);

    return NextResponse.json({
      logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Outreach log GET error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST — Log a manual outreach action
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await request.json();
    const { leadId, channel, action, messagePreview, videoLink } = body;

    if (!leadId || !channel || !action) {
      return NextResponse.json(
        { error: "leadId, channel y action son obligatorios" },
        { status: 400 }
      );
    }

    const log = await prisma.outreachLog.create({
      data: {
        userId: user.id,
        leadId,
        channel,
        action,
        messagePreview: messagePreview || null,
        videoLink: videoLink || null,
        status: "sent",
      },
    });

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    console.error("Outreach log POST error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
