import { NextRequest } from "next/server";
import { deleteTag } from "@/lib/services/tags.service";
import { apiGuard, apiSuccess, apiError } from "../../_lib/response";

// DELETE — Delete tag
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await apiGuard(request);
  if (!guard.ok) return guard.response;

  try {
    const { id } = await params;
    const result = await deleteTag(guard.user.userId, id);
    return apiSuccess(result, { rateLimit: guard.rateLimit });
  } catch (error) {
    return apiError(error, guard.rateLimit);
  }
}
