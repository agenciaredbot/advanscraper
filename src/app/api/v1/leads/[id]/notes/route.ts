import { NextRequest } from "next/server";
import { listNotes, createNote } from "@/lib/services/leads.service";
import { apiGuard, apiSuccess, apiError } from "../../../_lib/response";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await apiGuard(request);
  if (!guard.ok) return guard.response;
  try {
    const { id } = await params;
    const notes = await listNotes(guard.user.userId, id);
    return apiSuccess(notes, { rateLimit: guard.rateLimit });
  } catch (error) {
    return apiError(error, guard.rateLimit);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await apiGuard(request);
  if (!guard.ok) return guard.response;
  try {
    const { id } = await params;
    const { content } = await request.json();
    const note = await createNote(guard.user.userId, id, content || "");
    return apiSuccess(note, { status: 201, rateLimit: guard.rateLimit });
  } catch (error) {
    return apiError(error, guard.rateLimit);
  }
}
