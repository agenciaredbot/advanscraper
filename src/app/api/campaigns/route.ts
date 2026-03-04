import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listCampaigns, createCampaign } from "@/lib/services/campaigns.service";
import { ServiceError } from "@/lib/services/errors";

// GET — List campaigns
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const campaigns = await listCampaigns(user.id);
    return NextResponse.json(campaigns);
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Campaigns GET error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST — Create campaign
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await request.json();
    const campaign = await createCampaign(user.id, body);
    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Campaign POST error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
