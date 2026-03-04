import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/services/outreach.service";
import { ServiceError } from "@/lib/services/errors";

// POST — Send email to a lead via Brevo
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await params;
    const { subject, message, senderName, loomUrl } = (await request.json()) as {
      subject?: string;
      message?: string;
      senderName?: string;
      loomUrl?: string;
    };

    const result = await sendEmail(user.id, {
      leadId: id,
      subject: subject || "",
      message: message || "",
      senderName,
      loomUrl,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Email send error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error interno del servidor" },
      { status: 500 }
    );
  }
}
