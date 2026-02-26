import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { sendEmailViaBrevo, textToHtml } from "@/lib/outreach/brevo-email";

// POST — Send email to a lead via Brevo
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const { subject, message, senderName } = (await request.json()) as {
      subject?: string;
      message?: string;
      senderName?: string;
    };

    if (!subject || !message) {
      return NextResponse.json(
        { error: "Se requiere subject y message" },
        { status: 400 }
      );
    }

    // Get lead with email
    const lead = await prisma.lead.findFirst({
      where: { id, userId: user.id },
    });

    if (!lead) {
      return NextResponse.json(
        { error: "Lead no encontrado" },
        { status: 404 }
      );
    }

    if (!lead.email) {
      return NextResponse.json(
        { error: "Este lead no tiene email" },
        { status: 400 }
      );
    }

    // Resolve user's Brevo API key
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { brevoApiKey: true },
    });

    // Send email
    const htmlContent = textToHtml(message);
    const result = await sendEmailViaBrevo(
      {
        to: {
          email: lead.email,
          name: lead.businessName || lead.firstName || lead.contactPerson || undefined,
        },
        subject,
        htmlContent,
        textContent: message,
        senderName: senderName || undefined,
      },
      profile?.brevoApiKey || undefined
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Error al enviar email" },
        { status: 500 }
      );
    }

    // Log the outreach action
    await prisma.outreachLog.create({
      data: {
        userId: user.id,
        leadId: id,
        channel: "email",
        action: "email_sent",
        messagePreview: message.substring(0, 200),
        brevoMessageId: result.messageId || null,
        status: "sent",
      },
    });

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      message: "Email enviado exitosamente",
    });
  } catch (error) {
    console.error("Email send error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error interno del servidor" },
      { status: 500 }
    );
  }
}
