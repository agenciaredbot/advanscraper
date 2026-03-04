import { NextRequest } from "next/server";
import { addLeadsToList, removeLeadsFromList } from "@/lib/services/lists.service";
import { apiGuard, apiSuccess, apiError } from "../../../_lib/response";

// POST — Add leads to list
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await apiGuard(request);
  if (!guard.ok) return guard.response;

  try {
    const { id } = await params;
    const { leadIds } = await request.json();
    const result = await addLeadsToList(guard.user.userId, id, leadIds || []);
    return apiSuccess(result, { rateLimit: guard.rateLimit });
  } catch (error) {
    return apiError(error, guard.rateLimit);
  }
}

// DELETE — Remove leads from list
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await apiGuard(request);
  if (!guard.ok) return guard.response;

  try {
    const { id } = await params;
    const { leadIds } = await request.json();
    const result = await removeLeadsFromList(guard.user.userId, id, leadIds || []);
    return apiSuccess(result, { rateLimit: guard.rateLimit });
  } catch (error) {
    return apiError(error, guard.rateLimit);
  }
}
