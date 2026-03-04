import { NextRequest } from "next/server";
import { getLead, updateLead, deleteLead } from "@/lib/services/leads.service";
import { apiGuard, apiSuccess, apiError } from "../../_lib/response";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await apiGuard(request);
  if (!guard.ok) return guard.response;
  try {
    const { id } = await params;
    const lead = await getLead(guard.user.userId, id);
    return apiSuccess(lead, { rateLimit: guard.rateLimit });
  } catch (error) {
    return apiError(error, guard.rateLimit);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await apiGuard(request);
  if (!guard.ok) return guard.response;
  try {
    const { id } = await params;
    const body = await request.json();
    const updated = await updateLead(guard.user.userId, id, body);
    return apiSuccess(updated, { rateLimit: guard.rateLimit });
  } catch (error) {
    return apiError(error, guard.rateLimit);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await apiGuard(request);
  if (!guard.ok) return guard.response;
  try {
    const { id } = await params;
    const result = await deleteLead(guard.user.userId, id);
    return apiSuccess(result, { rateLimit: guard.rateLimit });
  } catch (error) {
    return apiError(error, guard.rateLimit);
  }
}
