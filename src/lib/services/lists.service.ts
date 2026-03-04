/**
 * Lists Service — CRUD for lead lists and managing list items.
 */

import { prisma } from "@/lib/db";
import { NotFoundError, ValidationError } from "./errors";
import type { CreateListParams, UpdateListParams } from "./types";

// ─── List All Lists ──────────────────────────────────────────────────────────

export async function listLeadLists(userId: string) {
  return prisma.leadList.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { items: true } },
    },
  });
}

// ─── Get List with Leads ─────────────────────────────────────────────────────

export async function getLeadList(userId: string, listId: string) {
  const list = await prisma.leadList.findFirst({
    where: { id: listId, userId },
    include: {
      items: {
        include: { lead: true },
        orderBy: { addedAt: "desc" },
      },
      _count: { select: { items: true } },
    },
  });

  if (!list) throw new NotFoundError("Lista");
  return list;
}

// ─── Create List ─────────────────────────────────────────────────────────────

export async function createLeadList(
  userId: string,
  params: CreateListParams
) {
  if (!params.name) {
    throw new ValidationError("Nombre requerido");
  }

  return prisma.leadList.create({
    data: {
      userId,
      name: params.name,
      description: params.description || null,
      color: params.color || "#3B82F6",
    },
  });
}

// ─── Update List ─────────────────────────────────────────────────────────────

export async function updateLeadList(
  userId: string,
  listId: string,
  params: UpdateListParams
) {
  const list = await prisma.leadList.findFirst({
    where: { id: listId, userId },
  });
  if (!list) throw new NotFoundError("Lista");

  return prisma.leadList.update({
    where: { id: listId },
    data: {
      name: params.name,
      description: params.description,
      color: params.color,
    },
  });
}

// ─── Delete List ─────────────────────────────────────────────────────────────

export async function deleteLeadList(userId: string, listId: string) {
  const list = await prisma.leadList.findFirst({
    where: { id: listId, userId },
  });
  if (!list) throw new NotFoundError("Lista");

  await prisma.leadList.delete({ where: { id: listId } });
  return { success: true };
}

// ─── Add Leads to List ───────────────────────────────────────────────────────

export async function addLeadsToList(
  userId: string,
  listId: string,
  leadIds: string[]
) {
  if (!leadIds || leadIds.length === 0) {
    throw new ValidationError("leadIds requerido (array)");
  }

  const list = await prisma.leadList.findFirst({
    where: { id: listId, userId },
  });
  if (!list) throw new NotFoundError("Lista");

  let addedCount = 0;
  for (const leadId of leadIds) {
    try {
      await prisma.leadListItem.create({
        data: { leadId, listId },
      });
      addedCount++;
    } catch {
      // Duplicate — already in list
    }
  }

  return { success: true, addedCount };
}

// ─── Remove Leads from List ─────────────────────────────────────────────────

export async function removeLeadsFromList(
  userId: string,
  listId: string,
  leadIds: string[]
) {
  if (!leadIds || leadIds.length === 0) {
    throw new ValidationError("leadIds requerido (array)");
  }

  const list = await prisma.leadList.findFirst({
    where: { id: listId, userId },
  });
  if (!list) throw new NotFoundError("Lista");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await prisma.leadListItem.deleteMany({
    where: {
      listId,
      leadId: { in: leadIds },
    } as any,
  });

  return { success: true };
}
