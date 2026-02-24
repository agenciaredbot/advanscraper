"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  ListFilter,
  Loader2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

interface LeadList {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    items: number;
  };
}

const PRESET_COLORS = [
  "#10B981", // emerald
  "#3B82F6", // blue
  "#8B5CF6", // violet
  "#F59E0B", // amber
  "#EF4444", // red
  "#EC4899", // pink
  "#06B6D4", // cyan
  "#F97316", // orange
];

export function ListManager() {
  const router = useRouter();
  const [lists, setLists] = useState<LeadList[]>([]);
  const [loading, setLoading] = useState(true);

  // Create/Edit dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingList, setEditingList] = useState<LeadList | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formColor, setFormColor] = useState(PRESET_COLORS[0]);
  const [saving, setSaving] = useState(false);

  // Delete confirm dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingList, setDeletingList] = useState<LeadList | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchLists = useCallback(async () => {
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
    fetchLists();
  }, [fetchLists]);

  const openCreateDialog = () => {
    setEditingList(null);
    setFormName("");
    setFormDescription("");
    setFormColor(PRESET_COLORS[0]);
    setDialogOpen(true);
  };

  const openEditDialog = (list: LeadList) => {
    setEditingList(list);
    setFormName(list.name);
    setFormDescription(list.description || "");
    setFormColor(list.color || PRESET_COLORS[0]);
    setDialogOpen(true);
  };

  const openDeleteDialog = (list: LeadList) => {
    setDeletingList(list);
    setDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    setSaving(true);
    try {
      const body = {
        name: formName.trim(),
        description: formDescription.trim() || null,
        color: formColor,
      };

      let res: Response;
      if (editingList) {
        res = await fetch(`/api/lists/${editingList.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch("/api/lists", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      if (!res.ok) throw new Error("Error saving list");

      toast.success(editingList ? "Lista actualizada" : "Lista creada");
      setDialogOpen(false);
      fetchLists();
    } catch {
      toast.error("Error al guardar la lista");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingList) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/lists/${deletingList.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Error deleting list");

      toast.success("Lista eliminada");
      setDeleteDialogOpen(false);
      setDeletingList(null);
      fetchLists();
    } catch {
      toast.error("Error al eliminar la lista");
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <>
      {lists.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-900/30 p-16">
          <ListFilter className="h-12 w-12 text-zinc-600 mb-4" />
          <p className="text-zinc-500 text-lg font-medium">
            No tienes listas aún
          </p>
          <p className="text-zinc-600 text-sm mt-1 mb-4">
            Crea tu primera lista para organizar tus leads
          </p>
          <Button
            onClick={openCreateDialog}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Crear Lista
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lists.map((list) => (
            <Card
              key={list.id}
              className="border-zinc-800 bg-zinc-900/50 hover:border-emerald-500/30 transition-all cursor-pointer group"
              onClick={() => router.push(`/lists/${list.id}`)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: list.color || "#3B82F6" }}
                    />
                    <h3 className="font-semibold text-zinc-100 truncate group-hover:text-emerald-400 transition-colors">
                      {list.name}
                    </h3>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-zinc-500 hover:text-zinc-300"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="bg-zinc-900 border-zinc-800"
                      >
                        <DropdownMenuItem
                          onClick={() => openEditDialog(list)}
                          className="text-zinc-300 focus:text-zinc-100 focus:bg-zinc-800"
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => openDeleteDialog(list)}
                          className="text-red-400 focus:text-red-300 focus:bg-red-500/10"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {list.description && (
                  <p className="text-sm text-zinc-400 mt-2 line-clamp-2">
                    {list.description}
                  </p>
                )}

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-800">
                  <span className="flex items-center gap-1.5 text-sm text-zinc-400">
                    <Users className="h-3.5 w-3.5" />
                    {list._count.items}{" "}
                    {list._count.items === 1 ? "lead" : "leads"}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {formatDate(list.createdAt)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">
              {editingList ? "Editar Lista" : "Nueva Lista"}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {editingList
                ? "Modifica los datos de tu lista"
                : "Crea una lista para organizar tus leads"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="list-name" className="text-zinc-300">
                Nombre *
              </Label>
              <Input
                id="list-name"
                placeholder="Ej: Restaurantes CDMX"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="list-description" className="text-zinc-300">
                Descripción
              </Label>
              <Textarea
                id="list-description"
                placeholder="Descripción opcional de la lista..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">Color</Label>
              <div className="flex items-center gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormColor(color)}
                    className="h-7 w-7 rounded-full transition-all flex items-center justify-center"
                    style={{
                      backgroundColor: color,
                      boxShadow:
                        formColor === color
                          ? `0 0 0 2px #18181b, 0 0 0 4px ${color}`
                          : "none",
                    }}
                  >
                    {formColor === color && (
                      <svg
                        className="h-3.5 w-3.5 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="border-zinc-700 text-zinc-400"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formName.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingList ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">
              Eliminar Lista
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              ¿Estás seguro de que quieres eliminar la lista{" "}
              <span className="font-semibold text-zinc-300">
                &quot;{deletingList?.name}&quot;
              </span>
              ? Esta acción no se puede deshacer. Los leads no serán eliminados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="border-zinc-700 text-zinc-400"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
