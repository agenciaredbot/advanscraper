import { NextRequest, NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/admin";
import {
  getAllSystemSettings,
  setSystemSetting,
  deleteSystemSetting,
  seedSystemKeysFromEnv,
  maskApiKey,
  SYSTEM_KEY_NAMES,
  SYSTEM_KEY_META,
  type SystemKeyName,
} from "@/lib/api-keys";

// ─── GET — List all system API keys (masked) ────────────────────────────────

export async function GET() {
  const { error } = await requireSuperadmin();
  if (error) return error;

  try {
    // Auto-seed from env on first load (only writes missing keys)
    await seedSystemKeysFromEnv();

    const allSettings = await getAllSystemSettings();
    const allKeyNames = Object.values(SYSTEM_KEY_NAMES);

    const keys = allKeyNames.map((key) => {
      const value = allSettings[key];
      const meta = SYSTEM_KEY_META[key as SystemKeyName];
      return {
        key,
        label: meta?.label ?? key,
        description: meta?.description ?? "",
        category: meta?.category ?? "Otro",
        hasValue: !!value,
        maskedValue: value ? maskApiKey(value) : null,
      };
    });

    return NextResponse.json({ keys });
  } catch (err) {
    console.error("Admin API keys GET error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// ─── PUT — Update system API keys ───────────────────────────────────────────

export async function PUT(request: NextRequest) {
  const { error } = await requireSuperadmin();
  if (error) return error;

  try {
    const body = await request.json();
    const { keys } = body as { keys: Record<string, string | null> };

    if (!keys || typeof keys !== "object") {
      return NextResponse.json(
        { error: "Se requiere un objeto 'keys' con los valores" },
        { status: 400 }
      );
    }

    const validKeyNames = new Set(Object.values(SYSTEM_KEY_NAMES));
    let updated = 0;
    let deleted = 0;

    for (const [key, value] of Object.entries(keys)) {
      if (!validKeyNames.has(key as SystemKeyName)) continue;

      if (value === null || value === "") {
        // Delete the key
        await deleteSystemSetting(key);
        deleted++;
      } else {
        await setSystemSetting(key, value.trim());
        updated++;
      }
    }

    return NextResponse.json({
      success: true,
      updated,
      deleted,
      message: `${updated} claves actualizadas${deleted > 0 ? `, ${deleted} eliminadas` : ""}`,
    });
  } catch (err) {
    console.error("Admin API keys PUT error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
