"use client";

import { ListManager } from "@/components/lead-lists/ListManager";

export default function ListsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100">Listas</h1>
          <p className="mt-1 text-zinc-400">
            Agrupa tus leads en listas para organizar campañas
          </p>
        </div>
      </div>

      <ListManager />
    </div>
  );
}
