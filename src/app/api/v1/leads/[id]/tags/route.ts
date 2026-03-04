import { NextRequest } from "next/server";
import { assignTags, removeTags } from "@/lib/services/leads.service";
import { apiGuard, apiSuccess, apiError } from "../../../_lib/response";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await apiGuard(request);
  if (!guard.ok) return guard.response;
  try {
    const { id } = await params;
    const body = await request.json();
    const result = await assignTags(guard.user.userId, id, body);
    return apiSuccess(result, { rateLimit: guard.rateLimit });
  } catch (error) {
    return apiError(error, guard.rateLimit);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await apiGuard(request);
  if (!guard.ok) return guard.response;
  try {
    const { id } = await params;
    const { tagIds } = await request.json();
    const result = await removeTags(guard.user.userId, id, tagIds || []);
    return apiSuccess(result, { rateLimit: guard.rateLimit });
  } catch (error) {
    return apiError(error, guard.rateLimit);
  }
}
