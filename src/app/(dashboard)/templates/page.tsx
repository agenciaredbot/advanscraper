"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Sparkles,
  Video,
  FileText,
  Loader2,
  Mail,
  MessageSquare,
  Linkedin,
  Instagram,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import {
  TemplateEditor,
  type TemplateFormData,
} from "@/components/templates/TemplateEditor";
import { TemplatePreview } from "@/components/templates/TemplatePreview";
import { AIMessagePreview } from "@/components/templates/AIMessagePreview";

// -------------------------------------------------------------------
// Types (matches Prisma model)
// -------------------------------------------------------------------

interface MessageTemplate {
  id: string;
  userId: string;
  name: string;
  channel: "email" | "whatsapp" | "linkedin" | "instagram";
  subject: string | null;
  bodyShort: string | null;
  bodyLong: string;
  includeVideo: boolean;
  videoType: string | null;
  videoId: string | null;
  useAI: boolean;
  aiInstructions: string | null;
  createdAt: string;
  updatedAt: string;
}

// -------------------------------------------------------------------
// Channel helpers
// -------------------------------------------------------------------

const CHANNEL_META: Record<
  string,
  { label: string; color: string; icon: React.ElementType }
> = {
  email: {
    label: "Email",
    color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    icon: Mail,
  },
  whatsapp: {
    label: "WhatsApp",
    color: "bg-green-500/10 text-green-400 border-green-500/20",
    icon: MessageSquare,
  },
  linkedin: {
    label: "LinkedIn",
    color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    icon: Linkedin,
  },
  instagram: {
    label: "Instagram",
    color: "bg-pink-500/10 text-pink-400 border-pink-500/20",
    icon: Instagram,
  },
};

function ChannelBadge({ channel }: { channel: string }) {
  const meta = CHANNEL_META[channel] ?? CHANNEL_META.email;
  const Icon = meta.icon;
  return (
    <Badge variant="outline" className={meta.color}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </Badge>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// -------------------------------------------------------------------
// Page component
// -------------------------------------------------------------------

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);

  // Preview dialog state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<MessageTemplate | null>(null);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ---- Fetch templates ----
  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/templates");
      if (!res.ok) throw new Error("Error cargando templates");
      const data = await res.json();
      setTemplates(data);
    } catch (err) {
      toast.error("No se pudieron cargar los templates");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // ---- Create / Update ----
  const handleSave = async (data: TemplateFormData) => {
    const isEditing = !!data.id;
    const url = isEditing ? `/api/templates/${data.id}` : "/api/templates";
    const method = isEditing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        channel: data.channel,
        subject: data.subject || null,
        bodyShort: data.bodyShort || null,
        bodyLong: data.bodyLong,
        useAI: data.useAI,
        aiInstructions: data.aiInstructions || null,
        includeVideo: data.includeVideo,
        videoType: data.videoType || null,
        videoId: data.videoId || null,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Error guardando template");
      return;
    }

    toast.success(isEditing ? "Template actualizado" : "Template creado");
    setEditorOpen(false);
    setEditingTemplate(null);
    fetchTemplates();
  };

  // ---- Delete ----
  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/templates/${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Template eliminado");
      setDeleteId(null);
      fetchTemplates();
    } catch {
      toast.error("Error eliminando template");
    } finally {
      setDeleting(false);
    }
  };

  // ---- Open editor for editing ----
  const openEdit = (tmpl: MessageTemplate) => {
    setEditingTemplate(tmpl);
    setEditorOpen(true);
  };

  // ---- Open editor for new ----
  const openNew = () => {
    setEditingTemplate(null);
    setEditorOpen(true);
  };

  // ---- Open preview ----
  const openPreview = (tmpl: MessageTemplate) => {
    setPreviewTemplate(tmpl);
    setPreviewOpen(true);
  };

  // Convert MessageTemplate to TemplateFormData
  const toFormData = (t: MessageTemplate): TemplateFormData => ({
    id: t.id,
    name: t.name,
    channel: t.channel,
    subject: t.subject ?? "",
    bodyShort: t.bodyShort ?? "",
    bodyLong: t.bodyLong,
    useAI: t.useAI,
    aiInstructions: t.aiInstructions ?? "",
    includeVideo: t.includeVideo,
    videoType: t.videoType ?? "sendspark",
    videoId: t.videoId ?? "",
  });

  return (
    <div className="space-y-6">
      {/* ---- Header ---- */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100">Templates</h1>
          <p className="mt-1 text-zinc-400">
            Crea y gestiona plantillas de mensajes con IA
          </p>
        </div>
        <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="h-4 w-4" />
          Nuevo Template
        </Button>
      </div>

      {/* ---- Content ---- */}
      {loading ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/30 p-16">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-500 mb-3" />
          <p className="text-zinc-500">Cargando templates...</p>
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-900/30 p-16">
          <FileText className="h-12 w-12 text-zinc-600 mb-4" />
          <p className="text-zinc-400 text-lg font-medium">Sin templates</p>
          <p className="text-zinc-600 text-sm mt-1 mb-4">
            Crea tu primer template para empezar a enviar mensajes
          </p>
          <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="h-4 w-4" />
            Crear template
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {templates.map((tmpl) => (
            <div
              key={tmpl.id}
              className="group relative flex flex-col rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 hover:border-zinc-700 transition-colors cursor-pointer"
              onClick={() => openPreview(tmpl)}
            >
              {/* Card header */}
              <div className="flex items-start justify-between mb-3">
                <div className="space-y-1 min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-zinc-100 truncate pr-2">
                    {tmpl.name}
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <ChannelBadge channel={tmpl.channel} />
                    {tmpl.useAI && (
                      <Badge
                        variant="outline"
                        className="bg-purple-500/10 text-purple-400 border-purple-500/20"
                      >
                        <Sparkles className="h-3 w-3" />
                        IA
                      </Badge>
                    )}
                    {tmpl.includeVideo && (
                      <Badge
                        variant="outline"
                        className="bg-amber-500/10 text-amber-400 border-amber-500/20"
                      >
                        <Video className="h-3 w-3" />
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Actions dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-zinc-200"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="bg-zinc-800 border-zinc-700"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DropdownMenuItem
                      onClick={() => openPreview(tmpl)}
                      className="text-zinc-300 focus:text-zinc-100"
                    >
                      <Eye className="h-4 w-4" />
                      Ver preview
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => openEdit(tmpl)}
                      className="text-zinc-300 focus:text-zinc-100"
                    >
                      <Pencil className="h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-zinc-700" />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setDeleteId(tmpl.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Body preview */}
              <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed flex-1">
                {tmpl.bodyLong}
              </p>

              {/* Footer */}
              <div className="mt-3 pt-3 border-t border-zinc-800/50">
                <p className="text-[11px] text-zinc-600">{formatDate(tmpl.updatedAt)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---- Editor Dialog ---- */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">
              {editingTemplate ? "Editar Template" : "Nuevo Template"}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {editingTemplate
                ? "Modifica los campos del template y guarda los cambios"
                : "Crea una plantilla de mensaje para tus campanas de outreach"}
            </DialogDescription>
          </DialogHeader>
          <TemplateEditor
            template={editingTemplate ? toFormData(editingTemplate) : undefined}
            onSave={handleSave}
            onCancel={() => {
              setEditorOpen(false);
              setEditingTemplate(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* ---- Preview Dialog ---- */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">
              {previewTemplate?.name ?? "Preview"}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Vista previa del template con datos de ejemplo
            </DialogDescription>
          </DialogHeader>
          {previewTemplate && (
            <Tabs defaultValue="preview" className="w-full">
              <TabsList className="bg-zinc-800/50">
                <TabsTrigger value="preview" className="text-xs">
                  Vista previa
                </TabsTrigger>
                {previewTemplate.useAI && (
                  <TabsTrigger value="ai" className="text-xs">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Probar IA
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="preview" className="mt-4">
                <TemplatePreview template={previewTemplate} />
              </TabsContent>

              {previewTemplate.useAI && (
                <TabsContent value="ai" className="mt-4">
                  <AIMessagePreview
                    templateBase={previewTemplate.bodyLong}
                    channel={previewTemplate.channel}
                    instructions={previewTemplate.aiInstructions ?? undefined}
                  />
                </TabsContent>
              )}
            </Tabs>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setPreviewOpen(false);
                if (previewTemplate) openEdit(previewTemplate);
              }}
              className="border-zinc-700 text-zinc-300"
            >
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
            <Button
              variant="outline"
              onClick={() => setPreviewOpen(false)}
              className="border-zinc-700 text-zinc-300"
            >
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ---- Delete Confirmation Dialog ---- */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Eliminar template</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Esta accion no se puede deshacer. El template se eliminara permanentemente.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setDeleteId(null)}
              className="border-zinc-700 text-zinc-300"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
