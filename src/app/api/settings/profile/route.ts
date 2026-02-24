import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma, getOrCreateProfile } from "@/lib/db";

// GET — Get profile settings (auto-creates profile if not found)
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const profile = await getOrCreateProfile(user.id, user.email ?? "", user.user_metadata?.name);

    // Don't return full API keys, just indicate if set
    return NextResponse.json({
      id: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role,
      isActive: profile.isActive,
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

    const profile = await prisma.profile.upsert({
      where: { id: user.id },
      update: updateData,
      create: {
        id: user.id,
        email: user.email ?? "",
        name: "",
        role: "user",
        isActive: true,
        dailyLimit: 50,
        ...updateData,
      },
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
