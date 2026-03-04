import { NextRequest } from "next/server";
import { getLeadList, updateLeadList, deleteLeadList } from "@/lib/services/lists.service";
import { apiGuard, apiSuccess, apiError } from "../../_lib/response";

// GET — Get list with leads
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await apiGuard(request);
  if (!guard.ok) return guard.response;

  try {
    const { id } = await params;
    const list = await getLeadList(guard.user.userId, id);
    return apiSuccess(list, { rateLimit: guard.rateLimit });
  } catch (error) {
    return apiError(error, guard.rateLimit);
  }
}

// PATCH — Update list
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await apiGuard(request);
  if (!guard.ok) return guard.response;

  try {
    const { id } = await params;
    const body = await request.json();
    const list = await updateLeadList(guard.user.userId, id, body);
    return apiSuccess(list, { rateLimit: guard.rateLimit });
  } catch (error) {
    return apiError(error, guard.rateLimit);
  }
}

// DELETE — Delete list
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await apiGuard(request);
  if (!guard.ok) return guard.response;

  try {
    const { id } = await params;
    const result = await deleteLeadList(guard.user.userId, id);
    return apiSuccess(result, { rateLimit: guard.rateLimit });
  } catch (error) {
    return apiError(error, guard.rateLimit);
  }
}
