import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";

// GET — Campaign detail
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await params;
    const campaign = await prisma.campaign.findFirst({
      where: { id, userId: user.id },
      include: {
        template: true,
        campaignLeads: {
          include: {
            lead: {
              select: {
                id: true, businessName: true, contactPerson: true, firstName: true, lastName: true,
                email: true, phone: true, city: true, state: true, industry: true, linkedinUrl: true, googleMapsUrl: true,
              },
            },
          },
          orderBy: { sentAt: "desc" },
        },
      },
    });

    if (!campaign) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    return NextResponse.json(campaign);
  } catch (error) {
    console.error("Campaign GET error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// DELETE — Delete campaign
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await params;
    const campaign = await prisma.campaign.findFirst({ where: { id, userId: user.id } });
    if (!campaign) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

    await prisma.campaign.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Campaign DELETE error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
