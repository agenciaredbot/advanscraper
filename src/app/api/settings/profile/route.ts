import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";

// GET — Get profile settings
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const profile = await prisma.profile.findUnique({ where: { id: user.id } });
    if (!profile) return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });

    // Don't return full API keys, just indicate if set
    return NextResponse.json({
      id: profile.id,
      email: profile.email,
      name: profile.name,
      dailyLimit: profile.dailyLimit,
      hasBrevoKey: !!profile.brevoApiKey,
      hasSendsparkKey: !!profile.sendsparkApiKey,
      hasAnthropicKey: !!profile.anthropicApiKey,
      hasApifyToken: !!profile.apifyApiToken,
    });
  } catch (error) {
    console.error("Profile GET error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// PUT — Update profile settings
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await request.json();

    // Build update data (only include fields that were provided)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.brevoApiKey !== undefined) updateData.brevoApiKey = body.brevoApiKey || null;
    if (body.sendsparkApiKey !== undefined) updateData.sendsparkApiKey = body.sendsparkApiKey || null;
    if (body.sendsparkApiSecret !== undefined) updateData.sendsparkApiSecret = body.sendsparkApiSecret || null;
    if (body.anthropicApiKey !== undefined) updateData.anthropicApiKey = body.anthropicApiKey || null;
    if (body.apifyApiToken !== undefined) updateData.apifyApiToken = body.apifyApiToken || null;

    const profile = await prisma.profile.update({
      where: { id: user.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      name: profile.name,
      hasBrevoKey: !!profile.brevoApiKey,
      hasSendsparkKey: !!profile.sendsparkApiKey,
      hasAnthropicKey: !!profile.anthropicApiKey,
      hasApifyToken: !!profile.apifyApiToken,
    });
  } catch (error) {
    console.error("Profile PUT error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
