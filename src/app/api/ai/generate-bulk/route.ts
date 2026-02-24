import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma, getOrCreateProfile } from "@/lib/db";
import { generateMessage } from "@/lib/ai/message-generator";
import type { GenerateBulkRequest, GeneratedMessage } from "@/lib/ai/types";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body: GenerateBulkRequest = await request.json();

    if (!body.channel || !body.leads || body.leads.length === 0) {
      return NextResponse.json(
        { error: "Campos 'channel' y 'leads' son obligatorios" },
        { status: 400 }
      );
    }

    if (body.leads.length > 20) {
      return NextResponse.json(
        { error: "Máximo 20 leads por bulk request" },
        { status: 400 }
      );
    }

    // Get user's API key
    const profile = await getOrCreateProfile(user.id, user.email ?? "");
    const apiKey = profile.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Configura tu API key de Anthropic" },
        { status: 400 }
      );
    }

    // Generate messages for each lead
    const results: Array<{ lead: string; message: GeneratedMessage | null; error?: string }> = [];

    for (const lead of body.leads) {
      try {
        const message = await generateMessage(
          {
            channel: body.channel,
            templateBase: body.templateBase,
            lead,
            instructions: body.instructions,
            includeVideo: body.includeVideo,
            videoLink: body.videoLink,
            videoTitle: body.videoTitle,
          },
          apiKey
        );

        results.push({
          lead: lead.contactPerson || lead.businessName || "Unknown",
          message,
        });
      } catch (error) {
        results.push({
          lead: lead.contactPerson || lead.businessName || "Unknown",
          message: null,
          error: error instanceof Error ? error.message : "Error",
        });
      }
    }

    return NextResponse.json({
      channel: body.channel,
      total: body.leads.length,
      generated: results.filter((r) => r.message).length,
      failed: results.filter((r) => !r.message).length,
      results,
    });
  } catch (error) {
    console.error("AI bulk generate error:", error);
    return NextResponse.json({ error: "Error generando mensajes" }, { status: 500 });
  }
}
