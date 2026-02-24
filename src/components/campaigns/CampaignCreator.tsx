"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LeadSelector } from "./LeadSelector";
import {
  Megaphone,
  Mail,
  MessageSquare,
  Linkedin,
  Instagram,
  Bot,
  Video,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Send,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

interface Template {
  id: string;
  name: string;
  channel: string;
  subject: string | null;
  bodyLong: string;
  bodyShort: string | null;
  useAI: boolean;
}

const channelConfig = {
  email: { label: "Email", icon: Mail, color: "text-emerald-400" },
  whatsapp: { label: "WhatsApp", icon: MessageSquare, color: "text-green-400" },
  linkedin: { label: "LinkedIn", icon: Linkedin, color: "text-blue-400" },
  instagram: { label: "Instagram", icon: Instagram, color: "text-pink-400" },
};

const steps = [
  { title: "Canal y Nombre", description: "Elige el canal y nombre de la campaña" },
  { title: "Leads", description: "Selecciona los destinatarios" },
  { title: "Template", description: "Elige o crea el mensaje" },
  { title: "Opciones", description: "IA, video y configuración" },
  { title: "Confirmar", description: "Revisa y lanza la campaña" },
];

export function CampaignCreator() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [creating, setCreating] = useState(false);

  // Step 1: Channel & Name
  const [name, setName] = useState("");
  const [channel, setChannel] = useState("email");

  // Step 2: Leads
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>("");

  // Step 3: Template
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [customBody, setCustomBody] = useState("");
  const [customSubject, setCustomSubject] = useState("");

  // Step 4: Options
  const [useAI, setUseAI] = useState(false);
  const [aiInstructions, setAiInstructions] = useState("");
  const [includeVideo, setIncludeVideo] = useState(false);
  const [videoType, setVideoType] = useState("loom");
  const [videoId, setVideoId] = useState("");

  // Fetch templates for selected channel
  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((data) => {
        setTemplates(
          Array.isArray(data)
            ? data.filter((t: Template) => t.channel === channel)
            : []
        );
      })
      .catch(() => {});
  }, [channel]);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  const canProceed = () => {
    switch (step) {
      case 0:
        return name.trim().length > 0;
      case 1:
        return selectedLeadIds.length > 0;
      case 2:
        return selectedTemplateId || customBody.trim().length > 0;
      case 3:
        return true;
      default:
        return true;
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      // If custom body provided and no template, create a template first
      let templateId = selectedTemplateId;

      if (!templateId && customBody.trim()) {
        const templateRes = await fetch("/api/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: `${name} - Template`,
            channel,
            subject: customSubject || null,
            bodyLong: customBody,
            useAI,
            aiInstructions: aiInstructions || null,
          }),
        });
        const newTemplate = await templateRes.json();
        templateId = newTemplate.id;
      }

      // Create campaign
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          channel,
          templateId,
          leadIds: selectedLeadIds,
          listId: selectedListId || undefined,
          useAI,
          aiInstructions: aiInstructions || undefined,
          includeVideo,
          videoType: includeVideo ? videoType : undefined,
          videoId: includeVideo ? videoId : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error creando campaña");
      }

      const campaign = await res.json();
      toast.success("Campaña creada exitosamente");
      router.push(`/campaigns/${campaign.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error creando campaña");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Steps indicator */}
      <div className="flex items-center justify-between mb-8">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                i < step
                  ? "bg-emerald-600 text-white"
                  : i === step
                  ? "bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/50"
                  : "bg-zinc-800 text-zinc-500"
              }`}
            >
              {i + 1}
            </div>
            {i < steps.length - 1 && (
              <div
                className={`w-8 md:w-16 h-0.5 mx-1 ${
                  i < step ? "bg-emerald-600" : "bg-zinc-800"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-zinc-100">{steps[step].title}</h2>
        <p className="text-sm text-zinc-400 mt-1">{steps[step].description}</p>
      </div>

      {/* Step 0: Channel & Name */}
      {step === 0 && (
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-2">
              <Label className="text-zinc-300">Nombre de la Campaña</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Restaurantes Bogotá - Email Diciembre"
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">Canal</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(channelConfig).map(([key, cfg]) => {
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={key}
                      onClick={() => setChannel(key)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-all ${
                        channel === key
                          ? "border-emerald-500/50 bg-emerald-500/10"
                          : "border-zinc-800 bg-zinc-900/30 hover:border-zinc-700"
                      }`}
                    >
                      <Icon
                        className={`h-6 w-6 ${
                          channel === key ? cfg.color : "text-zinc-500"
                        }`}
                      />
                      <span
                        className={`text-sm ${
                          channel === key ? "text-zinc-100" : "text-zinc-400"
                        }`}
                      >
                        {cfg.label}
                      </span>
                    </button>
                  );
                })}
              </div>
              {(channel === "linkedin" || channel === "instagram") && (
                <p className="text-xs text-amber-400 mt-2">
                  LinkedIn e Instagram son outreach asistido (1-a-1). Usa la sección Outreach para eso.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Lead Selection */}
      {step === 1 && (
        <LeadSelector
          channel={channel}
          selectedLeadIds={selectedLeadIds}
          onSelectionChange={setSelectedLeadIds}
        />
      )}

      {/* Step 2: Template */}
      {step === 2 && (
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader>
            <CardTitle className="text-zinc-100 flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-400" />
              Mensaje
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Existing templates */}
            {templates.length > 0 && (
              <div className="space-y-2">
                <Label className="text-zinc-300">Usar Template Existente</Label>
                <Select
                  value={selectedTemplateId}
                  onValueChange={(v) => {
                    setSelectedTemplateId(v);
                    setCustomBody("");
                    setCustomSubject("");
                  }}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-300">
                    <SelectValue placeholder="Selecciona un template..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Escribir mensaje personalizado</SelectItem>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                        {t.useAI && " (IA)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedTemplate && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 p-4 space-y-2">
                <p className="text-xs text-zinc-500 uppercase tracking-wider">
                  Vista previa
                </p>
                {selectedTemplate.subject && (
                  <p className="text-sm text-zinc-300">
                    <strong>Asunto:</strong> {selectedTemplate.subject}
                  </p>
                )}
                <p className="text-sm text-zinc-400 whitespace-pre-wrap">
                  {selectedTemplate.bodyLong.substring(0, 300)}
                  {selectedTemplate.bodyLong.length > 300 && "..."}
                </p>
              </div>
            )}

            {/* Custom message */}
            {(!selectedTemplateId || selectedTemplateId === "none") && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-zinc-300">Escribir Mensaje</Label>
                  <span className="text-xs text-zinc-500">
                    Variables: {"{{nombre}}"}, {"{{negocio}}"}, {"{{ciudad}}"}
                  </span>
                </div>
                {channel === "email" && (
                  <div className="space-y-2">
                    <Label className="text-zinc-400 text-xs">Asunto</Label>
                    <Input
                      value={customSubject}
                      onChange={(e) => setCustomSubject(e.target.value)}
                      placeholder="Asunto del email..."
                      className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                    />
                  </div>
                )}
                <Textarea
                  value={customBody}
                  onChange={(e) => setCustomBody(e.target.value)}
                  placeholder={`Escribe tu mensaje para ${channelConfig[channel as keyof typeof channelConfig]?.label || channel}...`}
                  rows={6}
                  className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Options */}
      {step === 3 && (
        <div className="space-y-4">
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bot className="h-5 w-5 text-violet-400" />
                  <div>
                    <p className="text-sm font-medium text-zinc-200">
                      Mejorar con IA (Claude)
                    </p>
                    <p className="text-xs text-zinc-500">
                      Personaliza cada mensaje automáticamente
                    </p>
                  </div>
                </div>
                <Switch checked={useAI} onCheckedChange={setUseAI} />
              </div>

              {useAI && (
                <div className="space-y-2 ml-8">
                  <Label className="text-zinc-400 text-xs">
                    Instrucciones para la IA
                  </Label>
                  <Textarea
                    value={aiInstructions}
                    onChange={(e) => setAiInstructions(e.target.value)}
                    placeholder="Ej: Tono amigable, mencionar el rating del negocio, incluir CTA..."
                    rows={2}
                    className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Video className="h-5 w-5 text-amber-400" />
                  <div>
                    <p className="text-sm font-medium text-zinc-200">
                      Incluir Video
                    </p>
                    <p className="text-xs text-zinc-500">
                      Adjunta un video personalizado
                    </p>
                  </div>
                </div>
                <Switch checked={includeVideo} onCheckedChange={setIncludeVideo} />
              </div>

              {includeVideo && (
                <div className="space-y-3 ml-8">
                  <Select value={videoType} onValueChange={setVideoType}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="loom">Loom</SelectItem>
                      <SelectItem value="sendspark">SendSpark</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={videoId}
                    onChange={(e) => setVideoId(e.target.value)}
                    placeholder={
                      videoType === "loom"
                        ? "URL del video Loom..."
                        : "ID del video SendSpark..."
                    }
                    className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 4: Confirm */}
      {step === 4 && (
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader>
            <CardTitle className="text-zinc-100 flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-emerald-400" />
              Resumen de Campaña
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">
                  Nombre
                </p>
                <p className="text-sm text-zinc-200 font-medium">{name}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">
                  Canal
                </p>
                <Badge
                  className={`${
                    channel === "email"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : channel === "whatsapp"
                      ? "bg-green-500/20 text-green-400"
                      : "bg-blue-500/20 text-blue-400"
                  }`}
                >
                  {channelConfig[channel as keyof typeof channelConfig]?.label || channel}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">
                  Leads
                </p>
                <p className="text-sm text-zinc-200 font-medium">
                  {selectedLeadIds.length} destinatarios
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">
                  Template
                </p>
                <p className="text-sm text-zinc-200 font-medium">
                  {selectedTemplate?.name || "Mensaje personalizado"}
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">
                  IA
                </p>
                <Badge
                  className={
                    useAI
                      ? "bg-violet-500/20 text-violet-400"
                      : "bg-zinc-500/20 text-zinc-400"
                  }
                >
                  {useAI ? "Activada" : "Desactivada"}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">
                  Video
                </p>
                <Badge
                  className={
                    includeVideo
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-zinc-500/20 text-zinc-400"
                  }
                >
                  {includeVideo ? videoType : "Sin video"}
                </Badge>
              </div>
            </div>

            {channel === "email" && (
              <div className="mt-4 p-4 rounded-lg border border-amber-500/30 bg-amber-500/5">
                <p className="text-xs text-amber-400">
                  Al lanzar la campaña, se enviarán {selectedLeadIds.length} emails
                  via Brevo. Asegúrate de tener tu API key configurada en Settings.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <Button
          variant="outline"
          onClick={() => (step === 0 ? router.push("/campaigns") : setStep(step - 1))}
          className="border-zinc-700 text-zinc-400"
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          {step === 0 ? "Cancelar" : "Anterior"}
        </Button>

        {step < 4 ? (
          <Button
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            Siguiente
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleCreate}
            disabled={creating}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {creating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creando...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Crear Campaña
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
