import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateAIMessagesBulk } from "@/lib/services/ai.service";
import { ServiceError } from "@/lib/services/errors";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await request.json();
    const result = await generateAIMessagesBulk(user.id, user.email ?? "", body);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("AI bulk generate error:", error);
    return NextResponse.json({ error: "Error generando mensajes" }, { status: 500 });
  }
}
