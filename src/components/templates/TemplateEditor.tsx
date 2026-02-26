"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, X, Sparkles, Video, Loader2 } from "lucide-react";

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

type Channel = "email" | "whatsapp" | "linkedin" | "instagram";

export interface TemplateFormData {
  id?: string;
  name: string;
  channel: Channel;
  subject: string;
  bodyShort: string;
  bodyLong: string;
  useAI: boolean;
  aiInstructions: string;
  includeVideo: boolean;
  videoType: string;
  videoId: string;
}

export interface TemplateEditorProps {
  template?: TemplateFormData | null;
  onSave: (data: TemplateFormData) => Promise<void> | void;
  onCancel: () => void;
}

// -------------------------------------------------------------------
// Available template variables
// -------------------------------------------------------------------

const TEMPLATE_VARIABLES = [
  { key: "{{nombre}}", label: "Nombre completo", description: "firstName + lastName" },
  { key: "{{nombre_pila}}", label: "Nombre", description: "Solo primer nombre (firstName)" },
  { key: "{{apellido}}", label: "Apellido", description: "Solo apellido (lastName)" },
  { key: "{{negocio}}", label: "Negocio", description: "businessName" },
  { key: "{{ciudad}}", label: "Ciudad", description: "city" },
  { key: "{{categoria}}", label: "Categoria", description: "category" },
  { key: "{{rating}}", label: "Rating", description: "rating" },
  { key: "{{website}}", label: "Website", description: "website" },
  { key: "{{estado}}", label: "Estado", description: "state / provincia" },
  { key: "{{industria}}", label: "Industria", description: "industry / sector" },
  { key: "{{linkedin}}", label: "LinkedIn URL", description: "linkedinUrl" },
  { key: "{{google_maps}}", label: "Google Maps URL", description: "googleMapsUrl" },
  { key: "{{video_link}}", label: "Video link", description: "URL del video" },
  { key: "{{video_thumbnail}}", label: "Video thumb", description: "Thumbnail del video" },
] as const;

const CHANNEL_OPTIONS: { value: Channel; label: string }[] = [
  { value: "email", label: "Email" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "instagram", label: "Instagram" },
];

// -------------------------------------------------------------------
// Component
// -------------------------------------------------------------------

export function TemplateEditor({ template, onSave, onCancel }: TemplateEditorProps) {
  const [name, setName] = useState(template?.name ?? "");
  const [channel, setChannel] = useState<Channel>(template?.channel ?? "email");
  const [subject, setSubject] = useState(template?.subject ?? "");
  const [bodyLong, setBodyLong] = useState(template?.bodyLong ?? "");
  const [bodyShort, setBodyShort] = useState(template?.bodyShort ?? "");
  const [useAI, setUseAI] = useState(template?.useAI ?? false);
  const [aiInstructions, setAiInstructions] = useState(template?.aiInstructions ?? "");
  const [includeVideo, setIncludeVideo] = useState(template?.includeVideo ?? false);
  const [videoType, setVideoType] = useState(template?.videoType ?? "sendspark");
  const [videoId, setVideoId] = useState(template?.videoId ?? "");
  const [saving, setSaving] = useState(false);

  // Refs for textarea cursor insertion
  const bodyLongRef = useRef<HTMLTextAreaElement>(null);
  const bodyShortRef = useRef<HTMLTextAreaElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);

  // Track which field was last focused so variable insertion goes to the right place
  const [lastFocused, setLastFocused] = useState<"subject" | "bodyLong" | "bodyShort">("bodyLong");

  // Reset form when template prop changes (edit mode)
  useEffect(() => {
    if (template) {
      setName(template.name);
      setChannel(template.channel);
      setSubject(template.subject ?? "");
      setBodyLong(template.bodyLong ?? "");
      setBodyShort(template.bodyShort ?? "");
      setUseAI(template.useAI ?? false);
      setAiInstructions(template.aiInstructions ?? "");
      setIncludeVideo(template.includeVideo ?? false);
      setVideoType(template.videoType ?? "sendspark");
      setVideoId(template.videoId ?? "");
    }
  }, [template]);

  // Insert variable at cursor position of the last-focused field
  const insertVariable = useCallback(
    (variable: string) => {
      const insertIntoTextarea = (
        ref: React.RefObject<HTMLTextAreaElement | null>,
        value: string,
        setter: (v: string) => void,
      ) => {
        const el = ref.current;
        if (!el) {
          setter(value + variable);
          return;
        }
        const start = el.selectionStart ?? value.length;
        const end = el.selectionEnd ?? value.length;
        const newValue = value.slice(0, start) + variable + value.slice(end);
        setter(newValue);
        // Restore cursor position after React re-render
        requestAnimationFrame(() => {
          el.focus();
          const pos = start + variable.length;
          el.setSelectionRange(pos, pos);
        });
      };

      const insertIntoInput = (
        ref: React.RefObject<HTMLInputElement | null>,
        value: string,
        setter: (v: string) => void,
      ) => {
        const el = ref.current;
        if (!el) {
          setter(value + variable);
          return;
        }
        const start = el.selectionStart ?? value.length;
        const end = el.selectionEnd ?? value.length;
        const newValue = value.slice(0, start) + variable + value.slice(end);
        setter(newValue);
        requestAnimationFrame(() => {
          el.focus();
          const pos = start + variable.length;
          el.setSelectionRange(pos, pos);
        });
      };

      if (lastFocused === "subject" && channel === "email") {
        insertIntoInput(subjectRef, subject, setSubject);
      } else if (lastFocused === "bodyShort" && channel === "linkedin") {
        insertIntoTextarea(bodyShortRef, bodyShort, setBodyShort);
      } else {
        insertIntoTextarea(bodyLongRef, bodyLong, setBodyLong);
      }
    },
    [lastFocused, channel, subject, bodyLong, bodyShort],
  );

  const handleSave = async () => {
    if (!name.trim() || !bodyLong.trim()) return;
    setSaving(true);
    try {
      await onSave({
        id: template?.id,
        name: name.trim(),
        channel,
        subject: channel === "email" ? subject.trim() : "",
        bodyShort: channel === "linkedin" ? bodyShort.trim() : "",
        bodyLong: bodyLong.trim(),
        useAI,
        aiInstructions: useAI ? aiInstructions.trim() : "",
        includeVideo,
        videoType: includeVideo ? videoType : "",
        videoId: includeVideo ? videoId.trim() : "",
      });
    } finally {
      setSaving(false);
    }
  };

  const isEditing = !!template?.id;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-6">
      {/* ---- Main form ---- */}
      <div className="space-y-5">
        {/* Name */}
        <div className="space-y-2">
          <Label className="text-zinc-300">Nombre del template</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Prospecto restaurantes"
            className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
          />
        </div>

        {/* Channel */}
        <div className="space-y-2">
          <Label className="text-zinc-300">Canal</Label>
          <Select value={channel} onValueChange={(v) => setChannel(v as Channel)}>
            <SelectTrigger className="w-full bg-zinc-800 border-zinc-700 text-zinc-100">
              <SelectValue placeholder="Seleccionar canal" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700">
              {CHANNEL_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Subject (email only) */}
        {channel === "email" && (
          <div className="space-y-2">
            <Label className="text-zinc-300">Asunto</Label>
            <Input
              ref={subjectRef}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              onFocus={() => setLastFocused("subject")}
              placeholder="Asunto del email - usa {{variables}}"
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
            />
          </div>
        )}

        {/* Body Long */}
        <div className="space-y-2">
          <Label className="text-zinc-300">Mensaje principal</Label>
          <Textarea
            ref={bodyLongRef}
            value={bodyLong}
            onChange={(e) => setBodyLong(e.target.value)}
            onFocus={() => setLastFocused("bodyLong")}
            rows={6}
            placeholder="Escribe tu mensaje aqui. Usa {{variables}} para personalizar..."
            className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 resize-y min-h-[150px]"
          />
        </div>

        {/* Body Short (LinkedIn only) */}
        {channel === "linkedin" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-zinc-300">Mensaje corto (nota de conexion)</Label>
              <span
                className={`text-xs tabular-nums ${
                  bodyShort.length > 300 ? "text-red-400" : "text-zinc-500"
                }`}
              >
                {bodyShort.length}/300
              </span>
            </div>
            <Textarea
              ref={bodyShortRef}
              value={bodyShort}
              onChange={(e) => setBodyShort(e.target.value)}
              onFocus={() => setLastFocused("bodyShort")}
              rows={3}
              maxLength={300}
              placeholder="Nota corta para solicitud de conexion..."
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 resize-none"
            />
          </div>
        )}

        <Separator className="bg-zinc-800" />

        {/* AI toggle */}
        <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3">
          <div className="flex items-center gap-3">
            <Sparkles className="h-4 w-4 text-emerald-400" />
            <div>
              <p className="text-sm font-medium text-zinc-200">Mejorar con IA</p>
              <p className="text-xs text-zinc-500">
                Claude personaliza el mensaje para cada lead
              </p>
            </div>
          </div>
          <Switch checked={useAI} onCheckedChange={setUseAI} />
        </div>

        {useAI && (
          <div className="space-y-2">
            <Label className="text-zinc-300">Instrucciones IA</Label>
            <Textarea
              value={aiInstructions}
              onChange={(e) => setAiInstructions(e.target.value)}
              rows={2}
              placeholder="Ej: Tono amigable, mencionar su rating, incluir CTA..."
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 resize-none"
            />
          </div>
        )}

        {/* Video toggle */}
        <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3">
          <div className="flex items-center gap-3">
            <Video className="h-4 w-4 text-emerald-400" />
            <div>
              <p className="text-sm font-medium text-zinc-200">Incluir video</p>
              <p className="text-xs text-zinc-500">
                Agrega un video personalizado al mensaje
              </p>
            </div>
          </div>
          <Switch checked={includeVideo} onCheckedChange={setIncludeVideo} />
        </div>

        {includeVideo && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-zinc-300">Tipo de video</Label>
              <Select value={videoType} onValueChange={setVideoType}>
                <SelectTrigger className="w-full bg-zinc-800 border-zinc-700 text-zinc-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="sendspark">Sendspark</SelectItem>
                  <SelectItem value="loom">Loom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-300">Video ID / URL</Label>
              <Input
                value={videoId}
                onChange={(e) => setVideoId(e.target.value)}
                placeholder={videoType === "loom" ? "https://www.loom.com/share/..." : "video-id"}
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <Button
            onClick={handleSave}
            disabled={saving || !name.trim() || !bodyLong.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isEditing ? "Guardar cambios" : "Crear template"}
          </Button>
          <Button variant="outline" onClick={onCancel} className="border-zinc-700 text-zinc-300">
            <X className="h-4 w-4" />
            Cancelar
          </Button>
        </div>
      </div>

      {/* ---- Variables sidebar ---- */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-zinc-300">Variables disponibles</p>
        <p className="text-xs text-zinc-500">
          Haz clic para insertar en el campo activo
        </p>
        <div className="flex flex-wrap gap-2">
          {TEMPLATE_VARIABLES.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => insertVariable(v.key)}
              title={v.description}
              className="group"
            >
              <Badge
                variant="outline"
                className="cursor-pointer border-zinc-700 text-zinc-400 hover:border-emerald-500/50 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
              >
                {v.label}
              </Badge>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
