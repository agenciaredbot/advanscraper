"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
  ArrowLeft,
  Loader2,
  Mail,
  Phone,
  Globe,
  Star,
  ExternalLink,
  Users,
  Pencil,
  Trash2,
  ListFilter,
} from "lucide-react";
import { toast } from "sonner";

interface Lead {
  id: string;
  source: string;
  businessName: string | null;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  city: string | null;
  category: string | null;
  rating: number | null;
  reviewsCount: number | null;
  profileUrl: string | null;
  scrapedAt: string;
}

interface ListItem {
  id: string;
  leadId: string;
  addedAt: string;
  lead: Lead;
}

interface LeadListDetail {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  createdAt: string;
  updatedAt: string;
  items: ListItem[];
  _count: {
    items: number;
  };
}

const sourceLabels: Record<string, { label: string; color: string }> = {
  google_maps: {
    label: "Google Maps",
    color: "bg-emerald-500/20 text-emerald-400",
  },
  linkedin: { label: "LinkedIn", color: "bg-blue-500/20 text-blue-400" },
  instagram: { label: "Instagram", color: "bg-pink-500/20 text-pink-400" },
  apify: { label: "Apify", color: "bg-amber-500/20 text-amber-400" },
};

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

export default function ListDetailPage() {
  const params = useParams();
  const router = useRouter();
  const listId = params.id as string;

  const [list, setList] = useState<LeadListDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [removing, setRemoving] = useState(false);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formColor, setFormColor] = useState(PRESET_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const fetchList = useCallback(async () => {
    try {
      const res = await fetch(`/api/lists/${listId}`);
      if (!res.ok) {
        if (res.status === 404) {
          toast.error("Lista no encontrada");
          router.push("/lists");
          return;
        }
        throw new Error("Error fetching list");
      }
      const data = await res.json();
      setList(data);
    } catch {
      toast.error("Error al cargar la lista");
    } finally {
      setLoading(false);
    }
  }, [listId, router]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const leads = list?.items.map((item) => item.lead) || [];
  const allSelected =
    leads.length > 0 && leads.every((l) => selectedIds.has(l.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.map((l) => l.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleRemoveLeads = async () => {
    if (selectedIds.size === 0) return;

    setRemoving(true);
    try {
      const res = await fetch(`/api/lists/${listId}/leads`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds: Array.from(selectedIds) }),
      });
      if (!res.ok) throw new Error("Error removing leads");

      toast.success(
        `${selectedIds.size} ${selectedIds.size === 1 ? "lead removido" : "leads removidos"} de la lista`
      );
      setSelectedIds(new Set());
      fetchList();
    } catch {
      toast.error("Error al remover leads de la lista");
    } finally {
      setRemoving(false);
    }
  };

  const openEditDialog = () => {
    if (!list) return;
    setFormName(list.name);
    setFormDescription(list.description || "");
    setFormColor(list.color || PRESET_COLORS[0]);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!formName.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/lists/${listId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          description: formDescription.trim() || null,
          color: formColor,
        }),
      });
      if (!res.ok) throw new Error("Error updating list");

      toast.success("Lista actualizada");
      setEditDialogOpen(false);
      fetchList();
    } catch {
      toast.error("Error al actualizar la lista");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (!list) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/lists")}
            className="border-zinc-700 text-zinc-400 mt-1"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <div
                className="h-3.5 w-3.5 rounded-full shrink-0"
                style={{ backgroundColor: list.color || "#3B82F6" }}
              />
              <h1 className="text-3xl font-bold text-zinc-100">{list.name}</h1>
            </div>
            {list.description && (
              <p className="mt-1 text-zinc-400 ml-[26px]">
                {list.description}
              </p>
            )}
            <div className="flex items-center gap-4 mt-2 ml-[26px]">
              <span className="flex items-center gap-1.5 text-sm text-zinc-400">
                <Users className="h-3.5 w-3.5" />
                {list._count.items}{" "}
                {list._count.items === 1 ? "lead" : "leads"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <>
              <span className="text-sm text-emerald-400 mr-2">
                {selectedIds.size} seleccionados
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemoveLeads}
                disabled={removing}
                className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
              >
                {removing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Quitar de lista
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={openEditDialog}
            className="border-zinc-700 text-zinc-400"
          >
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Button>
        </div>
      </div>

      {/* Leads Table */}
      {leads.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-900/30 p-16">
          <ListFilter className="h-12 w-12 text-zinc-600 mb-4" />
          <p className="text-zinc-500 text-lg font-medium">
            Esta lista está vacía
          </p>
          <p className="text-zinc-600 text-sm mt-1">
            Agrega leads desde la sección de Resultados
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-800 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead className="text-zinc-400">Negocio</TableHead>
                <TableHead className="text-zinc-400">Fuente</TableHead>
                <TableHead className="text-zinc-400">Contacto</TableHead>
                <TableHead className="text-zinc-400">Ciudad</TableHead>
                <TableHead className="text-zinc-400">Rating</TableHead>
                <TableHead className="text-zinc-400">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => {
                const srcConfig = sourceLabels[lead.source] || {
                  label: lead.source,
                  color: "bg-zinc-500/20 text-zinc-400",
                };

                return (
                  <TableRow
                    key={lead.id}
                    className="border-zinc-800 hover:bg-zinc-900/50"
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(lead.id)}
                        onCheckedChange={() => toggleOne(lead.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-zinc-200">
                          {lead.businessName ||
                            lead.contactPerson ||
                            "Sin nombre"}
                        </p>
                        {lead.category && (
                          <p className="text-xs text-zinc-500">
                            {lead.category}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={srcConfig.color}>
                        {srcConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {lead.email && (
                          <span className="flex items-center gap-1 text-xs text-zinc-400">
                            <Mail className="h-3 w-3" />
                            {lead.email}
                          </span>
                        )}
                        {lead.phone && (
                          <span className="flex items-center gap-1 text-xs text-zinc-400">
                            <Phone className="h-3 w-3" />
                            {lead.phone}
                          </span>
                        )}
                        {lead.website && (
                          <span className="flex items-center gap-1 text-xs text-zinc-400">
                            <Globe className="h-3 w-3" />
                            <span className="truncate max-w-[150px]">
                              {lead.website.replace(/^https?:\/\//, "")}
                            </span>
                          </span>
                        )}
                        {!lead.email && !lead.phone && !lead.website && (
                          <span className="text-xs text-zinc-600">
                            Sin datos
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-zinc-400 text-sm">
                      {lead.city || "\u2014"}
                    </TableCell>
                    <TableCell>
                      {lead.rating ? (
                        <span className="flex items-center gap-1 text-sm text-zinc-300">
                          <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                          {lead.rating}
                          {lead.reviewsCount != null && (
                            <span className="text-zinc-500">
                              ({lead.reviewsCount})
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-zinc-600">{"\u2014"}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {lead.profileUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="text-zinc-400 hover:text-emerald-400"
                        >
                          <a
                            href={lead.profileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Editar Lista</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Modifica los datos de tu lista
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-list-name" className="text-zinc-300">
                Nombre *
              </Label>
              <Input
                id="edit-list-name"
                placeholder="Ej: Restaurantes CDMX"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-list-description" className="text-zinc-300">
                Descripción
              </Label>
              <Textarea
                id="edit-list-description"
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
              onClick={() => setEditDialogOpen(false)}
              className="border-zinc-700 text-zinc-400"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={saving || !formName.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
