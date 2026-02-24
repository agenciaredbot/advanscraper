import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { generateMessage } from "@/lib/ai/message-generator";
import type { GenerateMessageRequest } from "@/lib/ai/types";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body: GenerateMessageRequest = await request.json();

    if (!body.channel || !body.lead) {
      return NextResponse.json(
        { error: "Campos 'channel' y 'lead' son obligatorios" },
        { status: 400 }
      );
    }

    // Get user's API key if available
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { anthropicApiKey: true },
    });

    const apiKey = profile?.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Configura tu API key de Anthropic en Settings o .env" },
        { status: 400 }
      );
    }

    const result = await generateMessage(body, apiKey);

    return NextResponse.json(result);
  } catch (error) {
    console.error("AI generate error:", error);
    const msg = error instanceof Error ? error.message : "Error generando mensaje";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
