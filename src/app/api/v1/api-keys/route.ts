import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiGuard, apiSuccess, apiError, apiUnauthorized } from "../_lib/response";
import { generateApiKey, getApiKeyUser } from "../_lib/auth";

// GET — List API keys (shows prefix, name, dates — never the full key)
export async function GET(request: NextRequest) {
  const guard = await apiGuard(request);
  if (!guard.ok) return guard.response;

  try {
    const keys = await prisma.apiKey.findMany({
      where: { userId: guard.user.userId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        lastUsedAt: true,
        expiresAt: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return apiSuccess(keys, { rateLimit: guard.rateLimit });
  } catch (error) {
    return apiError(error, guard.rateLimit);
  }
}

// POST — Create a new API key (returns the raw key ONCE)
export async function POST(request: NextRequest) {
  const guard = await apiGuard(request);
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json();
    const { name, scopes, expiresAt } = body as {
      name?: string;
      scopes?: string[];
      expiresAt?: string;
    };

    if (!name || name.trim().length === 0) {
      return apiError(
        { message: "El nombre es requerido", code: "VALIDATION_ERROR", statusCode: 400 },
        guard.rateLimit
      );
    }

    const { rawKey, keyHash, keyPrefix } = generateApiKey();

    const apiKey = await prisma.apiKey.create({
      data: {
        userId: guard.user.userId,
        name: name.trim(),
        keyHash,
        keyPrefix,
        scopes: scopes || [],
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    return apiSuccess(
      {
        id: apiKey.id,
        name: apiKey.name,
        key: rawKey, // Only returned once!
        keyPrefix: apiKey.keyPrefix,
        scopes: apiKey.scopes,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
      },
      { status: 201, rateLimit: guard.rateLimit }
    );
  } catch (error) {
    return apiError(error, guard.rateLimit);
  }
}
