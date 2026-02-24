import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { runEmailCampaign } from "@/lib/outreach/campaign-manager";

// POST — Send campaign
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id: campaignId } = await params;

    // Verify campaign
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, userId: user.id },
    });

    if (!campaign) return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });

    if (campaign.status !== "draft" && campaign.status !== "paused") {
      return NextResponse.json(
        { error: `Campaña en estado "${campaign.status}" no se puede enviar` },
        { status: 400 }
      );
    }

    // Get user's API keys
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
    });

    if (!profile) return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });

    if (campaign.channel === "email") {
      const brevoKey = profile.brevoApiKey || process.env.BREVO_API_KEY;
      if (!brevoKey) {
        return NextResponse.json(
          { error: "Configura tu API key de Brevo en Settings" },
          { status: 400 }
        );
      }

      // Start campaign in background
      runEmailCampaign({
        campaignId,
        userId: user.id,
        apiKeys: {
          brevoApiKey: brevoKey,
          anthropicApiKey: profile.anthropicApiKey || process.env.ANTHROPIC_API_KEY || undefined,
          senderEmail: process.env.BREVO_SENDER_EMAIL,
          senderName: process.env.BREVO_SENDER_NAME,
        },
      }).catch((err) => {
        console.error("Campaign send error:", err);
      });

      return NextResponse.json({
        success: true,
        message: "Campaña iniciada. Revisa el progreso en el dashboard de campaña.",
      });
    }

    return NextResponse.json(
      { error: `Canal "${campaign.channel}" no soportado para envío automático todavía` },
      { status: 400 }
    );
  } catch (error) {
    console.error("Campaign send error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
