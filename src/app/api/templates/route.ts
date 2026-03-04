import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listTemplates, createTemplate } from "@/lib/services/templates.service";
import { ServiceError } from "@/lib/services/errors";

// GET — List templates
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const templates = await listTemplates(user.id);
    return NextResponse.json(templates);
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Templates GET error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST — Create template
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await request.json();
    const template = await createTemplate(user.id, body);
    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Template POST error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
