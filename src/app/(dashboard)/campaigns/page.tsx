"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Megaphone,
  Plus,
  MoreVertical,
  Trash2,
  Eye,
  Loader2,
  Mail,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Send as SendIcon,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface Campaign {
  id: string;
  name: string;
  channel: string;
  status: string;
  totalLeads: number;
  sentCount: number;
  failedCount: number;
  useAI: boolean;
  createdAt: string;
  completedAt: string | null;
  template: { name: string; channel: string } | null;
  _count: { campaignLeads: number };
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: "Borrador", color: "bg-zinc-500/20 text-zinc-400", icon: Clock },
  sending: { label: "Enviando", color: "bg-blue-500/20 text-blue-400", icon: Loader2 },
  paused: { label: "Pausada", color: "bg-amber-500/20 text-amber-400", icon: AlertTriangle },
  completed: { label: "Completada", color: "bg-emerald-500/20 text-emerald-400", icon: CheckCircle },
  failed: { label: "Fallida", color: "bg-red-500/20 text-red-400", icon: XCircle },
};

const channelIcons: Record<string, React.ElementType> = {
  email: Mail,
  whatsapp: MessageSquare,
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCampaigns = async () => {
    try {
      const res = await fetch("/api/campaigns");
      if (!res.ok) throw new Error("Error");
      const data = await res.json();
      setCampaigns(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Error al cargar campañas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/campaigns/${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error");
      toast.success("Campaña eliminada");
      setCampaigns((prev) => prev.filter((c) => c.id !== deleteId));
      setDeleteId(null);
    } catch {
      toast.error("Error al eliminar");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100">Campañas</h1>
          <p className="mt-1 text-zinc-400">
            Crea y gestiona campañas de outreach por Email y WhatsApp
          </p>
        </div>
        <Link href="/campaigns/new">
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="mr-2 h-4 w-4" />
            Nueva Campaña
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-16">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-900/30 p-16">
          <Megaphone className="h-12 w-12 text-zinc-600 mb-4" />
          <p className="text-zinc-500 text-lg font-medium">No hay campañas aún</p>
          <p className="text-zinc-600 text-sm mt-1">
            Crea tu primera campaña para empezar a enviar mensajes
          </p>
          <Link href="/campaigns/new">
            <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="mr-2 h-4 w-4" />
              Crear Campaña
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => {
            const scfg = statusConfig[campaign.status] || statusConfig.draft;
            const StatusIcon = scfg.icon;
            const ChannelIcon = channelIcons[campaign.channel] || SendIcon;

            return (
              <Link key={campaign.id} href={`/campaigns/${campaign.id}`}>
                <Card className="border-zinc-800 bg-zinc-900/50 hover:border-emerald-500/30 transition-all cursor-pointer group">
                  <CardContent className="pt-5 pb-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <ChannelIcon className="h-4 w-4 text-zinc-500" />
                        <h3 className="font-semibold text-zinc-200 group-hover:text-emerald-400 transition-colors truncate max-w-[200px]">
                          {campaign.name}
                        </h3>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-zinc-500"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                          <DropdownMenuItem className="text-zinc-300">
                            <Eye className="mr-2 h-4 w-4" />
                            Ver Detalle
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-400"
                            onClick={(e) => {
                              e.preventDefault();
                              setDeleteId(campaign.id);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <Badge className={scfg.color}>
                        <StatusIcon
                          className={`mr-1 h-3 w-3 ${
                            campaign.status === "sending" ? "animate-spin" : ""
                          }`}
                        />
                        {scfg.label}
                      </Badge>
                      {campaign.useAI && (
                        <Badge className="bg-violet-500/20 text-violet-400">IA</Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-lg font-bold text-zinc-200">
                          {campaign.totalLeads}
                        </p>
                        <p className="text-[10px] text-zinc-500 uppercase">Total</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-emerald-400">
                          {campaign.sentCount}
                        </p>
                        <p className="text-[10px] text-zinc-500 uppercase">Enviados</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-red-400">
                          {campaign.failedCount}
                        </p>
                        <p className="text-[10px] text-zinc-500 uppercase">Fallidos</p>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-600 mt-3">
                      {new Date(campaign.createdAt).toLocaleDateString("es-CO")}
                      {campaign.template && ` · ${campaign.template.name}`}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Delete confirmation */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Eliminar Campaña</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Esta acción no se puede deshacer. Se eliminarán todos los datos de la campaña.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteId(null)}
              className="border-zinc-700 text-zinc-400"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
