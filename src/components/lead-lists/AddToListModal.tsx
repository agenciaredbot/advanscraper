"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Plus, ListFilter } from "lucide-react";
import { toast } from "sonner";

interface LeadList {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  _count: {
    items: number;
  };
}

interface AddToListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadIds: string[];
}

const PRESET_COLORS = [
  "#10B981",
  "#3B82F6",
  "#8B5CF6",
  "#F59E0B",
  "#EF4444",
  "#EC4899",
  "#06B6D4",
  "#F97316",
];

export function AddToListModal({
  open,
  onOpenChange,
  leadIds,
}: AddToListModalProps) {
  const [lists, setLists] = useState<LeadList[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedListIds, setSelectedListIds] = useState<Set<string>>(
    new Set()
  );
  const [adding, setAdding] = useState(false);

  // Inline create state
  const [showCreate, setShowCreate] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListColor, setNewListColor] = useState(PRESET_COLORS[1]);
  const [creating, setCreating] = useState(false);

  const fetchLists = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/lists");
      if (!res.ok) throw new Error("Error fetching lists");
      const data = await res.json();
      setLists(data);
    } catch {
      toast.error("Error al cargar listas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchLists();
      setSelectedListIds(new Set());
      setShowCreate(false);
      setNewListName("");
      setNewListColor(PRESET_COLORS[1]);
    }
  }, [open, fetchLists]);

  const toggleList = (listId: string) => {
    setSelectedListIds((prev) => {
      const next = new Set(prev);
      if (next.has(listId)) {
        next.delete(listId);
      } else {
        next.add(listId);
      }
      return next;
    });
  };

  const handleCreateList = async () => {
    if (!newListName.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newListName.trim(),
          color: newListColor,
        }),
      });
      if (!res.ok) throw new Error("Error creating list");

      const newList = await res.json();
      setLists((prev) => [
        { ...newList, _count: { items: 0 } },
        ...prev,
      ]);
      setSelectedListIds((prev) => new Set([...prev, newList.id]));
      setShowCreate(false);
      setNewListName("");
      toast.success("Lista creada");
    } catch {
      toast.error("Error al crear la lista");
    } finally {
      setCreating(false);
    }
  };

  const handleAddToLists = async () => {
    if (selectedListIds.size === 0) {
      toast.error("Selecciona al menos una lista");
      return;
    }

    setAdding(true);
    try {
      const promises = Array.from(selectedListIds).map((listId) =>
        fetch(`/api/lists/${listId}/leads`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadIds }),
        })
      );

      const results = await Promise.all(promises);
      const allOk = results.every((r) => r.ok);

      if (!allOk) throw new Error("Some requests failed");

      toast.success(
        `${leadIds.length} ${leadIds.length === 1 ? "lead agregado" : "leads agregados"} a ${selectedListIds.size} ${selectedListIds.size === 1 ? "lista" : "listas"}`
      );
      onOpenChange(false);
    } catch {
      toast.error("Error al agregar leads a las listas");
    } finally {
      setAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">
            Agregar a Lista
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {leadIds.length === 1
              ? "Selecciona las listas donde agregar este lead"
              : `Selecciona las listas donde agregar ${leadIds.length} leads`}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
            </div>
          ) : (
            <div className="space-y-1 max-h-[280px] overflow-y-auto pr-1">
              {lists.length === 0 && !showCreate && (
                <div className="flex flex-col items-center py-6">
                  <ListFilter className="h-8 w-8 text-zinc-600 mb-2" />
                  <p className="text-sm text-zinc-500">
                    No tienes listas aún
                  </p>
                </div>
              )}

              {lists.map((list) => (
                <label
                  key={list.id}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-zinc-800/50 cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={selectedListIds.has(list.id)}
                    onCheckedChange={() => toggleList(list.id)}
                  />
                  <div
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: list.color || "#3B82F6" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">
                      {list.name}
                    </p>
                  </div>
                  <span className="text-xs text-zinc-500 shrink-0">
                    {list._count.items} leads
                  </span>
                </label>
              ))}
            </div>
          )}

          <Separator className="my-3 bg-zinc-800" />

          {showCreate ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-zinc-300 text-sm">
                  Nombre de la lista
                </Label>
                <Input
                  placeholder="Ej: Leads calificados"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleCreateList()
                  }
                  className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                  autoFocus
                />
              </div>
              <div className="flex items-center gap-1.5">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewListColor(color)}
                    className="h-5 w-5 rounded-full transition-all"
                    style={{
                      backgroundColor: color,
                      boxShadow:
                        newListColor === color
                          ? `0 0 0 2px #18181b, 0 0 0 3px ${color}`
                          : "none",
                    }}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreate(false)}
                  className="border-zinc-700 text-zinc-400"
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreateList}
                  disabled={creating || !newListName.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {creating && (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  )}
                  Crear
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreate(true)}
              className="w-full border-zinc-700 text-zinc-400 border-dashed"
            >
              <Plus className="mr-2 h-4 w-4" />
              Crear nueva lista
            </Button>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-zinc-700 text-zinc-400"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleAddToLists}
            disabled={adding || selectedListIds.size === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {adding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Agregar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
