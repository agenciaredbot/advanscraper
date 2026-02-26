"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, MessageSquare, Linkedin, Instagram } from "lucide-react";
import type { LeadContext } from "@/lib/ai/types";

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

interface TemplateData {
  channel: string;
  subject?: string | null;
  bodyShort?: string | null;
  bodyLong: string;
  includeVideo?: boolean;
  videoType?: string | null;
  videoId?: string | null;
}

interface TemplatePreviewProps {
  template: TemplateData;
  sampleLead?: LeadContext | null;
}

// -------------------------------------------------------------------
// Default sample lead for preview
// -------------------------------------------------------------------

const DEFAULT_SAMPLE_LEAD: LeadContext = {
  businessName: "Restaurante El Buen Sabor",
  contactPerson: "Maria Garcia Lopez",
  firstName: "Maria",
  lastName: "Garcia Lopez",
  contactTitle: "Propietaria",
  email: "maria@elbuensabor.com",
  phone: "+52 55 1234 5678",
  website: "https://elbuensabor.com",
  city: "Ciudad de Mexico",
  category: "Restaurantes",
  rating: 4.5,
  followers: 2300,
  bio: "El mejor sabor de Mexico",
  profileUrl: "https://instagram.com/elbuensabor",
};

// -------------------------------------------------------------------
// Replace template variables with lead data
// -------------------------------------------------------------------

function replaceVariables(text: string, lead: LeadContext): string {
  if (!text) return "";

  const firstName = lead.firstName ?? lead.contactPerson?.split(" ")[0] ?? lead.businessName ?? "";
  const nombre = lead.contactPerson ?? [lead.firstName, lead.lastName].filter(Boolean).join(" ") ?? lead.businessName ?? "";

  return text
    .replace(/\{\{nombre\}\}/g, nombre)
    .replace(/\{\{nombre_pila\}\}/g, firstName)
    .replace(/\{\{negocio\}\}/g, lead.businessName ?? "")
    .replace(/\{\{ciudad\}\}/g, lead.city ?? "")
    .replace(/\{\{categoria\}\}/g, lead.category ?? "")
    .replace(/\{\{rating\}\}/g, lead.rating != null ? String(lead.rating) : "")
    .replace(/\{\{website\}\}/g, lead.website ?? "")
    .replace(/\{\{video_link\}\}/g, "#video-link")
    .replace(/\{\{video_thumbnail\}\}/g, "#video-thumbnail");
}

// -------------------------------------------------------------------
// Channel icon helper
// -------------------------------------------------------------------

function ChannelIcon({ channel }: { channel: string }) {
  switch (channel) {
    case "email":
      return <Mail className="h-4 w-4" />;
    case "whatsapp":
      return <MessageSquare className="h-4 w-4" />;
    case "linkedin":
      return <Linkedin className="h-4 w-4" />;
    case "instagram":
      return <Instagram className="h-4 w-4" />;
    default:
      return <Mail className="h-4 w-4" />;
  }
}

// -------------------------------------------------------------------
// Sub-preview per channel
// -------------------------------------------------------------------

function EmailPreview({ subject, body }: { subject: string; body: string }) {
  return (
    <div className="space-y-3">
      {/* Email header */}
      <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
        <div className="space-y-2 text-sm">
          <div className="flex gap-2">
            <span className="text-zinc-500 w-12 shrink-0">Para:</span>
            <span className="text-zinc-300">maria@elbuensabor.com</span>
          </div>
          <div className="flex gap-2">
            <span className="text-zinc-500 w-12 shrink-0">Asunto:</span>
            <span className="text-zinc-100 font-medium">{subject || "(sin asunto)"}</span>
          </div>
        </div>
      </div>
      {/* Email body */}
      <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
        <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

function WhatsAppPreview({ body }: { body: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-xl rounded-tr-sm bg-emerald-800/50 border border-emerald-700/30 px-4 py-3">
        <p className="text-sm text-zinc-100 whitespace-pre-wrap leading-relaxed">{body}</p>
        <div className="mt-1 flex justify-end">
          <span className="text-[10px] text-zinc-500">12:00 PM</span>
        </div>
      </div>
    </div>
  );
}

function LinkedInPreview({ bodyShort, bodyLong }: { bodyShort: string; bodyLong: string }) {
  return (
    <div className="space-y-4">
      {bodyShort && (
        <div>
          <p className="text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">
            Nota de conexion
          </p>
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3">
            <p className="text-sm text-zinc-200 whitespace-pre-wrap">{bodyShort}</p>
            <div className="mt-2 text-right">
              <span
                className={`text-xs tabular-nums ${
                  bodyShort.length > 300 ? "text-red-400" : "text-zinc-500"
                }`}
              >
                {bodyShort.length}/300
              </span>
            </div>
          </div>
        </div>
      )}
      <div>
        <p className="text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">
          Mensaje InMail
        </p>
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-3">
          <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">{bodyLong}</p>
        </div>
      </div>
    </div>
  );
}

function InstagramPreview({ body }: { body: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
          Tu
        </div>
        <span className="text-sm text-zinc-300 font-medium">Tu cuenta</span>
      </div>
      <div className="rounded-xl rounded-tl-sm bg-zinc-800 px-4 py-3 max-w-[85%]">
        <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------
// Main component
// -------------------------------------------------------------------

export function TemplatePreview({ template, sampleLead }: TemplatePreviewProps) {
  const lead = sampleLead ?? DEFAULT_SAMPLE_LEAD;

  const rendered = useMemo(
    () => ({
      subject: replaceVariables(template.subject ?? "", lead),
      bodyShort: replaceVariables(template.bodyShort ?? "", lead),
      bodyLong: replaceVariables(template.bodyLong, lead),
    }),
    [template.subject, template.bodyShort, template.bodyLong, lead],
  );

  const channelColor: Record<string, string> = {
    email: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    whatsapp: "bg-green-500/10 text-green-400 border-green-500/20",
    linkedin: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    instagram: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className={channelColor[template.channel] ?? channelColor.email}
        >
          <ChannelIcon channel={template.channel} />
          {template.channel.charAt(0).toUpperCase() + template.channel.slice(1)}
        </Badge>
        {template.includeVideo && (
          <Badge variant="outline" className="border-zinc-700 text-zinc-400">
            Video incluido
          </Badge>
        )}
      </div>

      {/* Tabs: raw template vs rendered preview */}
      <Tabs defaultValue="preview" className="w-full">
        <TabsList className="bg-zinc-800/50">
          <TabsTrigger value="preview" className="text-xs">
            Vista previa
          </TabsTrigger>
          <TabsTrigger value="raw" className="text-xs">
            Template
          </TabsTrigger>
        </TabsList>

        {/* Rendered preview */}
        <TabsContent value="preview" className="mt-3">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
            {template.channel === "email" && (
              <EmailPreview subject={rendered.subject} body={rendered.bodyLong} />
            )}
            {template.channel === "whatsapp" && <WhatsAppPreview body={rendered.bodyLong} />}
            {template.channel === "linkedin" && (
              <LinkedInPreview bodyShort={rendered.bodyShort} bodyLong={rendered.bodyLong} />
            )}
            {template.channel === "instagram" && <InstagramPreview body={rendered.bodyLong} />}
          </div>
        </TabsContent>

        {/* Raw template */}
        <TabsContent value="raw" className="mt-3">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
            {template.channel === "email" && template.subject && (
              <div>
                <p className="text-xs text-zinc-500 mb-1">Asunto:</p>
                <p className="text-sm text-zinc-300 font-mono">{template.subject}</p>
              </div>
            )}
            {template.channel === "linkedin" && template.bodyShort && (
              <div>
                <p className="text-xs text-zinc-500 mb-1">Nota corta:</p>
                <p className="text-sm text-zinc-300 font-mono whitespace-pre-wrap">
                  {template.bodyShort}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs text-zinc-500 mb-1">Mensaje:</p>
              <p className="text-sm text-zinc-300 font-mono whitespace-pre-wrap">
                {template.bodyLong}
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Sample lead info */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 px-4 py-3">
        <p className="text-xs font-medium text-zinc-500 mb-2">Datos de ejemplo usados:</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <span className="text-zinc-500">Nombre:</span>
          <span className="text-zinc-400">{lead.firstName || lead.contactPerson}</span>
          <span className="text-zinc-500">Apellido:</span>
          <span className="text-zinc-400">{lead.lastName || "—"}</span>
          <span className="text-zinc-500">Negocio:</span>
          <span className="text-zinc-400">{lead.businessName}</span>
          <span className="text-zinc-500">Ciudad:</span>
          <span className="text-zinc-400">{lead.city}</span>
          <span className="text-zinc-500">Categoria:</span>
          <span className="text-zinc-400">{lead.category}</span>
          <span className="text-zinc-500">Rating:</span>
          <span className="text-zinc-400">{lead.rating}</span>
        </div>
      </div>
    </div>
  );
}
