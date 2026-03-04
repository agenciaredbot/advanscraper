import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCampaign, deleteCampaign } from "@/lib/services/campaigns.service";
import { ServiceError } from "@/lib/services/errors";

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
    const campaign = await getCampaign(user.id, id);
    return NextResponse.json(campaign);
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
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
    const result = await deleteCampaign(user.id, id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Campaign DELETE error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
