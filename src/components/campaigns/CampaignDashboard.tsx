"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Send,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Play,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface CampaignLead {
  id: string;
  status: string;
  message: string | null;
  sentAt: string | null;
  errorMessage: string | null;
  lead: {
    id: string;
    businessName: string | null;
    contactPerson: string | null;
    email: string | null;
    phone: string | null;
    city: string | null;
  };
}

interface Campaign {
  id: string;
  name: string;
  channel: string;
  status: string;
  totalLeads: number;
  sentCount: number;
  failedCount: number;
  useAI: boolean;
  includeVideo: boolean;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  template: {
    id: string;
    name: string;
    channel: string;
  } | null;
  campaignLeads: CampaignLead[];
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: "Borrador", color: "bg-zinc-500/20 text-zinc-400", icon: Clock },
  sending: { label: "Enviando", color: "bg-blue-500/20 text-blue-400", icon: Loader2 },
  paused: { label: "Pausada", color: "bg-amber-500/20 text-amber-400", icon: AlertTriangle },
  completed: { label: "Completada", color: "bg-emerald-500/20 text-emerald-400", icon: CheckCircle },
  failed: { label: "Fallida", color: "bg-red-500/20 text-red-400", icon: XCircle },
};

const leadStatusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendiente", color: "bg-zinc-500/20 text-zinc-400" },
  sent: { label: "Enviado", color: "bg-emerald-500/20 text-emerald-400" },
  failed: { label: "Fallido", color: "bg-red-500/20 text-red-400" },
  skipped: { label: "Omitido", color: "bg-amber-500/20 text-amber-400" },
};

export function CampaignDashboard({ campaignId }: { campaignId: string }) {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const fetchCampaign = async () => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`);
      if (!res.ok) throw new Error("Error");
      const data = await res.json();
      setCampaign(data);
    } catch {
      toast.error("Error al cargar campaña");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaign();
  }, [campaignId]);

  // Auto-refresh while sending
  useEffect(() => {
    if (campaign?.status === "sending") {
      const interval = setInterval(fetchCampaign, 5000);
      return () => clearInterval(interval);
    }
  }, [campaign?.status]);

  const handleSend = async () => {
    if (!campaign) return;
    setSending(true);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/send`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error enviando");
      toast.success(data.message || "Campaña iniciada");
      fetchCampaign();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error enviando campaña");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-16">
        <p className="text-zinc-500">Campaña no encontrada</p>
        <Link href="/campaigns">
          <Button variant="outline" className="mt-4 border-zinc-700 text-zinc-400">
            Volver a Campañas
          </Button>
        </Link>
      </div>
    );
  }

  const statusCfg = statusConfig[campaign.status] || statusConfig.draft;
  const StatusIcon = statusCfg.icon;
  const progress =
    campaign.totalLeads > 0
      ? ((campaign.sentCount + campaign.failedCount) / campaign.totalLeads) * 100
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/campaigns">
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-zinc-200">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">{campaign.name}</h1>
            <p className="text-sm text-zinc-400">
              {campaign.template?.name || "Sin template"} &middot; {campaign.channel}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={statusCfg.color}>
            <StatusIcon className={`mr-1 h-3 w-3 ${campaign.status === "sending" ? "animate-spin" : ""}`} />
            {statusCfg.label}
          </Badge>
          {(campaign.status === "draft" || campaign.status === "paused") && (
            <Button
              onClick={handleSend}
              disabled={sending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {sending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              {campaign.status === "draft" ? "Lanzar Campaña" : "Reanudar"}
            </Button>
          )}
          {campaign.status === "sending" && (
            <Button
              variant="outline"
              size="sm"
              onClick={fetchCampaign}
              className="border-zinc-700 text-zinc-400"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-zinc-500 uppercase">Total Leads</p>
            <p className="text-2xl font-bold text-zinc-100">{campaign.totalLeads}</p>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-zinc-500 uppercase">Enviados</p>
            <p className="text-2xl font-bold text-emerald-400">{campaign.sentCount}</p>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-zinc-500 uppercase">Fallidos</p>
            <p className="text-2xl font-bold text-red-400">{campaign.failedCount}</p>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-zinc-500 uppercase">Pendientes</p>
            <p className="text-2xl font-bold text-zinc-300">
              {campaign.totalLeads - campaign.sentCount - campaign.failedCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress bar */}
      {campaign.status === "sending" && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-zinc-500">
            <span>Progreso</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Campaign Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-zinc-500 text-xs">Creada</p>
          <p className="text-zinc-300">
            {new Date(campaign.createdAt).toLocaleDateString("es-CO")}
          </p>
        </div>
        {campaign.startedAt && (
          <div>
            <p className="text-zinc-500 text-xs">Iniciada</p>
            <p className="text-zinc-300">
              {new Date(campaign.startedAt).toLocaleString("es-CO")}
            </p>
          </div>
        )}
        {campaign.completedAt && (
          <div>
            <p className="text-zinc-500 text-xs">Completada</p>
            <p className="text-zinc-300">
              {new Date(campaign.completedAt).toLocaleString("es-CO")}
            </p>
          </div>
        )}
        <div>
          <p className="text-zinc-500 text-xs">IA</p>
          <p className="text-zinc-300">{campaign.useAI ? "Activada" : "Desactivada"}</p>
        </div>
      </div>

      {/* Campaign Leads Table */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="text-zinc-100 text-lg">
            Leads ({campaign.campaignLeads.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-zinc-800 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead className="text-zinc-400">Lead</TableHead>
                  <TableHead className="text-zinc-400">Contacto</TableHead>
                  <TableHead className="text-zinc-400">Estado</TableHead>
                  <TableHead className="text-zinc-400">Enviado</TableHead>
                  <TableHead className="text-zinc-400">Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaign.campaignLeads.map((cl) => {
                  const lstatus = leadStatusConfig[cl.status] || leadStatusConfig.pending;
                  return (
                    <TableRow key={cl.id} className="border-zinc-800">
                      <TableCell>
                        <p className="text-sm text-zinc-200">
                          {cl.lead.businessName || cl.lead.contactPerson || "Sin nombre"}
                        </p>
                        {cl.lead.city && (
                          <p className="text-xs text-zinc-500">{cl.lead.city}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-zinc-400">
                        {campaign.channel === "email"
                          ? cl.lead.email || "—"
                          : cl.lead.phone || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge className={lstatus.color}>{lstatus.label}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-zinc-500">
                        {cl.sentAt
                          ? new Date(cl.sentAt).toLocaleString("es-CO")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-red-400 max-w-[200px] truncate">
                        {cl.errorMessage || "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
