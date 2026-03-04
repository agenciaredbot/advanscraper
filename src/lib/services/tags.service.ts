/**
 * Tags Service — CRUD for lead tags.
 */

import { prisma } from "@/lib/db";
import { NotFoundError, ValidationError, ConflictError } from "./errors";
import type { CreateTagParams, UpdateTagParams } from "./types";

// ─── List Tags ───────────────────────────────────────────────────────────────

export async function listTags(userId: string) {
  return prisma.leadTag.findMany({
    where: { userId },
    include: {
      _count: { select: { assignments: true } },
    },
    orderBy: { name: "asc" },
  });
}

// ─── Create Tag ──────────────────────────────────────────────────────────────

export async function createTag(userId: string, params: CreateTagParams) {
  if (!params.name || params.name.trim().length === 0) {
    throw new ValidationError("El nombre es requerido");
  }

  try {
    return await prisma.leadTag.create({
      data: {
        userId,
        name: params.name.trim(),
        color: params.color || "#10B981",
      },
    });
  } catch {
    throw new ConflictError("Ya existe un tag con ese nombre");
  }
}

// ─── Update Tag ──────────────────────────────────────────────────────────────

export async function updateTag(
  userId: string,
  tagId: string,
  params: UpdateTagParams
) {
  const tag = await prisma.leadTag.findFirst({
    where: { id: tagId, userId },
  });
  if (!tag) throw new NotFoundError("Tag");

  const data: Record<string, string> = {};
  if (params.name && params.name.trim().length > 0) data.name = params.name.trim();
  if (params.color) data.color = params.color;

  return prisma.leadTag.update({
    where: { id: tagId },
    data,
  });
}

// ─── Delete Tag ──────────────────────────────────────────────────────────────

export async function deleteTag(userId: string, tagId: string) {
  const tag = await prisma.leadTag.findFirst({
    where: { id: tagId, userId },
  });
  if (!tag) throw new NotFoundError("Tag");

  await prisma.leadTag.delete({ where: { id: tagId } });
  return { success: true };
}
