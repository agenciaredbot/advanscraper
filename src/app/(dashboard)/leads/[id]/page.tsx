"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Loader2,
  ArrowLeft,
  Mail,
  Clock,
} from "lucide-react";
import { ContactActions } from "@/components/leads/ContactActions";
import { TagManager } from "@/components/leads/TagManager";
import { LeadEditForm } from "@/components/leads/LeadEditForm";
import { NotesSection } from "@/components/leads/NotesSection";
import { QuickEmailComposer } from "@/components/leads/QuickEmailComposer";

interface Lead {
  id: string;
  source: string;
  businessName: string | null;
  contactPerson: string | null;
  contactTitle: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  category: string | null;
  rating: number | null;
  reviewsCount: number | null;
  followers: number | null;
  isBusiness: boolean | null;
  bio: string | null;
  profileUrl: string | null;
  isSaved: boolean;
  savedAt: string | null;
  scrapedAt: string;
  tags?: Array<{ tag: { id: string; name: string; color: string } }>;
  notes?: Array<{
    id: string;
    content: string;
    createdAt: string;
    updatedAt: string;
  }>;
  outreachLogs?: Array<{
    id: string;
    channel: string;
    action: string;
    messagePreview: string | null;
    status: string;
    sentAt: string;
  }>;
  listItems?: Array<{
    list: { id: string; name: string; color: string | null };
  }>;
}

const sourceLabels: Record<string, { label: string; color: string }> = {
  google_maps: {
    label: "Google Maps",
    color: "bg-emerald-500/20 text-emerald-400",
  },
  linkedin: { label: "LinkedIn", color: "bg-blue-500/20 text-blue-400" },
  instagram: { label: "Instagram", color: "bg-pink-500/20 text-pink-400" },
  facebook: { label: "Facebook", color: "bg-indigo-500/20 text-indigo-400" },
  apify: { label: "Apify (legacy)", color: "bg-amber-500/20 text-amber-400" },
  manual: { label: "Manual", color: "bg-violet-500/20 text-violet-400" },
  csv_import: { label: "Importado", color: "bg-cyan-500/20 text-cyan-400" },
};

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return "hace unos segundos";
  if (diffMin < 60) return `hace ${diffMin} minuto${diffMin !== 1 ? "s" : ""}`;
  if (diffHours < 24)
    return `hace ${diffHours} hora${diffHours !== 1 ? "s" : ""}`;
  if (diffDays < 30) return `hace ${diffDays} dia${diffDays !== 1 ? "s" : ""}`;

  return date.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("info");

  const fetchLead = useCallback(async () => {
    try {
      const res = await fetch(`/api/leads/${id}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al cargar lead");
      }
      const data = await res.json();
      setLead(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar lead");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchLead();
  }, [fetchLead]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <p className="text-red-400 text-sm">{error || "Lead no encontrado"}</p>
        <Button
          variant="outline"
          className="border-zinc-700 text-zinc-400"
          onClick={() => router.push("/leads")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a leads
        </Button>
      </div>
    );
  }

  const srcConfig = sourceLabels[lead.source] || {
    label: lead.source,
    color: "bg-zinc-500/20 text-zinc-400",
  };

  const currentTags = lead.tags?.map((t) => t.tag) || [];
  const outreachLogs = lead.outreachLogs || [];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back button */}
      <Link
        href="/leads"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a leads
      </Link>

      {/* Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-zinc-100">
                {lead.businessName || lead.contactPerson || "Sin nombre"}
              </h1>
              <Badge className={srcConfig.color}>{srcConfig.label}</Badge>
            </div>
            {lead.contactPerson && lead.businessName && (
              <p className="text-sm text-zinc-400">
                {lead.contactPerson}
                {lead.contactTitle ? ` - ${lead.contactTitle}` : ""}
              </p>
            )}
          </div>
        </div>

        {/* Contact Actions */}
        <ContactActions
          lead={lead}
          onEmailClick={() => setActiveTab("mensajes")}
        />

        {/* Tags */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider shrink-0">
            Tags
          </span>
          <TagManager
            leadId={lead.id}
            currentTags={currentTags}
            onTagsChanged={fetchLead}
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="info">Informacion</TabsTrigger>
          <TabsTrigger value="notas">Notas</TabsTrigger>
          <TabsTrigger value="actividad">Actividad</TabsTrigger>
          <TabsTrigger value="mensajes">Mensajes</TabsTrigger>
        </TabsList>

        {/* Info tab */}
        <TabsContent value="info" className="mt-6">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
            <LeadEditForm lead={lead} onSaved={fetchLead} />
          </div>
        </TabsContent>

        {/* Notes tab */}
        <TabsContent value="notas" className="mt-6">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
            <NotesSection leadId={lead.id} />
          </div>
        </TabsContent>

        {/* Activity tab */}
        <TabsContent value="actividad" className="mt-6">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
            {outreachLogs.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
                <p className="text-sm text-zinc-500">
                  No hay actividad de outreach registrada
                </p>
              </div>
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-3 top-0 bottom-0 w-px bg-zinc-800" />

                <div className="space-y-4">
                  {outreachLogs.map((log) => (
                    <div key={log.id} className="relative flex gap-4 pl-8">
                      {/* Timeline dot */}
                      <div
                        className={`absolute left-1.5 top-1.5 h-3 w-3 rounded-full border-2 border-zinc-950 ${
                          log.status === "sent"
                            ? "bg-emerald-500"
                            : log.status === "failed"
                              ? "bg-red-500"
                              : "bg-zinc-600"
                        }`}
                      />

                      <div className="flex-1 rounded-lg bg-zinc-900 border border-zinc-800 p-4">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge
                            variant="secondary"
                            className="bg-zinc-800 text-zinc-300 text-xs"
                          >
                            {log.channel}
                          </Badge>
                          <span className="text-sm text-zinc-300">
                            {log.action.replace(/_/g, " ")}
                          </span>
                          <Badge
                            variant="secondary"
                            className={
                              log.status === "sent"
                                ? "bg-emerald-500/20 text-emerald-400 text-xs"
                                : log.status === "failed"
                                  ? "bg-red-500/20 text-red-400 text-xs"
                                  : "bg-zinc-800 text-zinc-500 text-xs"
                            }
                          >
                            {log.status}
                          </Badge>
                        </div>

                        {log.messagePreview && (
                          <p className="text-sm text-zinc-500 line-clamp-2 mb-2">
                            {log.messagePreview}
                          </p>
                        )}

                        <p className="text-xs text-zinc-600">
                          {formatRelativeTime(log.sentAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Messages tab */}
        <TabsContent value="mensajes" className="mt-6">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
            {lead.email ? (
              <QuickEmailComposer lead={lead} onSent={fetchLead} />
            ) : (
              <div className="text-center py-12">
                <Mail className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
                <p className="text-sm text-zinc-500">
                  Este lead no tiene email registrado
                </p>
                <p className="text-xs text-zinc-600 mt-1">
                  Agrega un email en la pestana de Informacion
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
