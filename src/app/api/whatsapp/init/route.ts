import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { initWhatsApp } from "@/lib/outreach/whatsapp";

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const result = await initWhatsApp();
    return NextResponse.json(result);
  } catch (error) {
    console.error("WhatsApp init error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
