import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendCampaign } from "@/lib/services/campaigns.service";
import { ServiceError } from "@/lib/services/errors";

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
    const result = await sendCampaign(user.id, user.email ?? "", campaignId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Campaign send error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
