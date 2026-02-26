"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  MapPin,
  Star,
  Phone,
  Mail,
  Globe,
  Tag,
  ExternalLink,
  ArrowRight,
} from "lucide-react";
import { ContactActions } from "./ContactActions";
import { TagManager } from "./TagManager";

interface Lead {
  id: string;
  source: string;
  businessName: string | null;
  contactPerson: string | null;
  firstName: string | null;
  lastName: string | null;
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
  state: string | null;
  industry: string | null;
  linkedinUrl: string | null;
  googleMapsUrl: string | null;
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

interface LeadDetailSheetProps {
  leadId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeadUpdated?: () => void;
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return "hace unos segundos";
  if (diffMin < 60) return `hace ${diffMin} min`;
  if (diffHours < 24) return `hace ${diffHours}h`;
  if (diffDays < 30) return `hace ${diffDays}d`;

  return date.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
  });
}

export function LeadDetailSheet({
  leadId,
  open,
  onOpenChange,
  onLeadUpdated,
}: LeadDetailSheetProps) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLead = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/leads/${leadId}`);
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
  }, [leadId]);

  useEffect(() => {
    if (open && leadId) {
      fetchLead();
    } else {
      setLead(null);
      setError(null);
    }
  }, [open, leadId, fetchLead]);

  const handleLeadUpdated = () => {
    fetchLead();
    onLeadUpdated?.();
  };

  const srcConfig = lead
    ? sourceLabels[lead.source] || {
        label: lead.source,
        color: "bg-zinc-500/20 text-zinc-400",
      }
    : null;

  const currentTags = lead?.tags?.map((t) => t.tag) || [];
  const lastNotes = lead?.notes?.slice(0, 3) || [];
  const lastOutreach = lead?.outreachLogs?.slice(0, 3) || [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="sm:max-w-lg bg-zinc-950 border-zinc-800 p-0"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        ) : lead ? (
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
              {/* Header */}
              <SheetHeader className="p-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <SheetTitle className="text-lg font-semibold text-zinc-100 truncate">
                      {lead.businessName ||
                        lead.contactPerson ||
                        lead.firstName ||
                        "Sin nombre"}
                    </SheetTitle>
                    <SheetDescription className="text-sm text-zinc-500">
                      {(lead.firstName || lead.contactPerson) && lead.businessName
                        ? [lead.firstName, lead.lastName].filter(Boolean).join(" ") || lead.contactPerson
                        : lead.contactTitle || "Lead"}
                    </SheetDescription>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {srcConfig && (
                      <Badge className={srcConfig.color}>
                        {srcConfig.label}
                      </Badge>
                    )}
                  </div>
                </div>
                <Link
                  href={`/leads/${lead.id}`}
                  className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 hover:underline mt-2"
                >
                  Ver completo
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </SheetHeader>

              {/* Contact Actions */}
              <ContactActions lead={lead} />

              {/* Quick info cards */}
              <div className="grid grid-cols-2 gap-3">
                {lead.category && (
                  <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3">
                    <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
                      <Tag className="h-3 w-3" />
                      Categoria
                    </div>
                    <p className="text-sm text-zinc-200 truncate">
                      {lead.category}
                    </p>
                  </div>
                )}
                {lead.city && (
                  <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3">
                    <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
                      <MapPin className="h-3 w-3" />
                      Ciudad
                    </div>
                    <p className="text-sm text-zinc-200 truncate">
                      {lead.city}
                      {lead.state ? `, ${lead.state}` : ""}
                      {lead.country ? `, ${lead.country}` : ""}
                    </p>
                  </div>
                )}
                {lead.rating && (
                  <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3">
                    <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
                      <Star className="h-3 w-3" />
                      Rating
                    </div>
                    <p className="text-sm text-zinc-200">
                      {lead.rating}
                      {lead.reviewsCount != null && (
                        <span className="text-zinc-500 ml-1">
                          ({lead.reviewsCount} resenas)
                        </span>
                      )}
                    </p>
                  </div>
                )}
                {lead.phone && (
                  <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3">
                    <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
                      <Phone className="h-3 w-3" />
                      Telefono
                    </div>
                    <p className="text-sm text-zinc-200 truncate">
                      {lead.phone}
                    </p>
                  </div>
                )}
                {lead.email && (
                  <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3">
                    <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
                      <Mail className="h-3 w-3" />
                      Email
                    </div>
                    <p className="text-sm text-zinc-200 truncate">
                      {lead.email}
                    </p>
                  </div>
                )}
                {lead.website && (
                  <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3">
                    <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
                      <Globe className="h-3 w-3" />
                      Website
                    </div>
                    <a
                      href={lead.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-emerald-400 hover:text-emerald-300 hover:underline truncate block"
                    >
                      {lead.website
                        .replace(/^https?:\/\//, "")
                        .replace(/\/$/, "")}
                    </a>
                  </div>
                )}
                {lead.industry && (
                  <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3">
                    <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
                      <Tag className="h-3 w-3" />
                      Industria
                    </div>
                    <p className="text-sm text-zinc-200 truncate">
                      {lead.industry}
                    </p>
                  </div>
                )}
                {lead.linkedinUrl && (
                  <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3">
                    <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
                      <ExternalLink className="h-3 w-3" />
                      LinkedIn
                    </div>
                    <a
                      href={lead.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-400 hover:text-blue-300 hover:underline truncate block"
                    >
                      {lead.linkedinUrl
                        .replace(/^https?:\/\//, "")
                        .replace(/\/$/, "")}
                    </a>
                  </div>
                )}
                {lead.googleMapsUrl && (
                  <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3">
                    <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
                      <MapPin className="h-3 w-3" />
                      Google Maps
                    </div>
                    <a
                      href={lead.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-emerald-400 hover:text-emerald-300 hover:underline truncate block"
                    >
                      Ver en Google Maps
                    </a>
                  </div>
                )}
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">
                  Tags
                </p>
                <TagManager
                  leadId={lead.id}
                  currentTags={currentTags}
                  onTagsChanged={handleLeadUpdated}
                />
              </div>

              {/* Last 3 notes */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">
                    Notas
                  </p>
                  {(lead.notes?.length ?? 0) > 3 && (
                    <Link
                      href={`/leads/${lead.id}`}
                      className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300"
                    >
                      Ver todas
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
                {lastNotes.length === 0 ? (
                  <p className="text-xs text-zinc-600 py-2">Sin notas</p>
                ) : (
                  <div className="space-y-2">
                    {lastNotes.map((note) => (
                      <div
                        key={note.id}
                        className="rounded-lg bg-zinc-900 border border-zinc-800 p-3"
                      >
                        <p className="text-sm text-zinc-300 line-clamp-2">
                          {note.content}
                        </p>
                        <p className="text-xs text-zinc-600 mt-1">
                          {formatRelativeTime(note.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Last 3 outreach logs */}
              <div className="space-y-2">
                <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">
                  Actividad reciente
                </p>
                {lastOutreach.length === 0 ? (
                  <p className="text-xs text-zinc-600 py-2">
                    Sin actividad de outreach
                  </p>
                ) : (
                  <div className="space-y-2">
                    {lastOutreach.map((log) => (
                      <div
                        key={log.id}
                        className="rounded-lg bg-zinc-900 border border-zinc-800 p-3"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant="secondary"
                            className="bg-zinc-800 text-zinc-400 text-[10px]"
                          >
                            {log.channel}
                          </Badge>
                          <span className="text-xs text-zinc-500">
                            {log.action.replace(/_/g, " ")}
                          </span>
                          <Badge
                            variant="secondary"
                            className={
                              log.status === "sent"
                                ? "bg-emerald-500/20 text-emerald-400 text-[10px]"
                                : "bg-zinc-800 text-zinc-500 text-[10px]"
                            }
                          >
                            {log.status}
                          </Badge>
                        </div>
                        {log.messagePreview && (
                          <p className="text-xs text-zinc-500 line-clamp-1">
                            {log.messagePreview}
                          </p>
                        )}
                        <p className="text-xs text-zinc-600 mt-1">
                          {formatRelativeTime(log.sentAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
