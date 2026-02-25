"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Search,
  Megaphone,
  Send,
  TrendingUp,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";

interface DashboardStats {
  totalLeads: number;
  leadsToday: number;
  searchesToday: number;
  activeCampaigns: number;
  messagesSent: number;
  recentSearches: Array<{
    id: string;
    source: string;
    query: string;
    totalResults: number;
    status: string;
    createdAt: string;
  }>;
  recentCampaigns: Array<{
    id: string;
    name: string;
    channel: string;
    status: string;
    sentCount: number;
    totalLeads: number;
    createdAt: string;
  }>;
  leadsBySource: Array<{
    source: string;
    count: number;
  }>;
}

const sourceLabels: Record<string, { label: string; color: string }> = {
  google_maps: { label: "Google Maps", color: "bg-emerald-500" },
  linkedin: { label: "LinkedIn", color: "bg-blue-500" },
  instagram: { label: "Instagram", color: "bg-pink-500" },
  facebook: { label: "Facebook", color: "bg-indigo-500" },
  apify: { label: "Apify (legacy)", color: "bg-amber-500" },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: "Borrador", color: "bg-zinc-500/20 text-zinc-400" },
  sending: { label: "Enviando", color: "bg-blue-500/20 text-blue-400" },
  completed: { label: "Completada", color: "bg-emerald-500/20 text-emerald-400" },
  failed: { label: "Fallida", color: "bg-red-500/20 text-red-400" },
  paused: { label: "Pausada", color: "bg-amber-500/20 text-amber-400" },
  pending: { label: "Pendiente", color: "bg-zinc-500/20 text-zinc-400" },
  running: { label: "Ejecutando", color: "bg-blue-500/20 text-blue-400" },
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-zinc-100">Dashboard</h1>
        <p className="mt-1 text-zinc-400">
          Resumen de tu actividad en LeadScraper Pro
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-100">
              {stats?.totalLeads?.toLocaleString() || "0"}
            </div>
            <p className="text-xs text-zinc-500 mt-1">{stats?.leadsToday || 0} hoy</p>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Búsquedas Hoy</CardTitle>
            <Search className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-100">{stats?.searchesToday || "0"}</div>
            <p className="text-xs text-zinc-500 mt-1">Sesiones de scraping</p>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Campañas Activas</CardTitle>
            <Megaphone className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-100">{stats?.activeCampaigns || "0"}</div>
            <p className="text-xs text-zinc-500 mt-1">Email + WhatsApp</p>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Mensajes Enviados</CardTitle>
            <Send className="h-4 w-4 text-violet-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-100">{stats?.messagesSent || "0"}</div>
            <p className="text-xs text-zinc-500 mt-1">Este mes</p>
          </CardContent>
        </Card>
      </div>

      {/* Leads by Source */}
      {stats?.leadsBySource && stats.leadsBySource.length > 0 && (
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader>
            <CardTitle className="text-zinc-100 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
              Leads por Fuente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.leadsBySource.map((item) => {
                const src = sourceLabels[item.source] || { label: item.source, color: "bg-zinc-500" };
                const total = stats.totalLeads || 1;
                const pct = Math.round((item.count / total) * 100);
                return (
                  <div key={item.source} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-300">{src.label}</span>
                      <span className="text-zinc-400">{item.count} ({pct}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-800">
                      <div className={`h-full rounded-full ${src.color} transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Searches */}
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-zinc-100 text-base">Búsquedas Recientes</CardTitle>
            <Link href="/search" className="text-xs text-emerald-400 hover:underline">Ver todas</Link>
          </CardHeader>
          <CardContent>
            {!stats?.recentSearches || stats.recentSearches.length === 0 ? (
              <p className="text-zinc-500 text-sm text-center py-4">No hay búsquedas aún</p>
            ) : (
              <div className="space-y-2">
                {stats.recentSearches.map((search) => {
                  const scfg = statusConfig[search.status] || statusConfig.pending;
                  return (
                    <div key={search.id} className="flex items-center justify-between rounded-lg border border-zinc-800 p-3">
                      <div>
                        <p className="text-sm text-zinc-200">{search.query}</p>
                        <p className="text-xs text-zinc-500">
                          {sourceLabels[search.source]?.label || search.source} &middot; {new Date(search.createdAt).toLocaleDateString("es-CO")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-zinc-300">{search.totalResults}</span>
                        <Badge className={scfg.color}>{scfg.label}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Campaigns */}
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-zinc-100 text-base">Campañas Recientes</CardTitle>
            <Link href="/campaigns" className="text-xs text-emerald-400 hover:underline">Ver todas</Link>
          </CardHeader>
          <CardContent>
            {!stats?.recentCampaigns || stats.recentCampaigns.length === 0 ? (
              <p className="text-zinc-500 text-sm text-center py-4">No hay campañas aún</p>
            ) : (
              <div className="space-y-2">
                {stats.recentCampaigns.map((campaign) => {
                  const scfg = statusConfig[campaign.status] || statusConfig.draft;
                  return (
                    <Link key={campaign.id} href={`/campaigns/${campaign.id}`} className="flex items-center justify-between rounded-lg border border-zinc-800 p-3 hover:border-zinc-700 transition">
                      <div>
                        <p className="text-sm text-zinc-200">{campaign.name}</p>
                        <p className="text-xs text-zinc-500">
                          {campaign.channel} &middot; {new Date(campaign.createdAt).toLocaleDateString("es-CO")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-400">{campaign.sentCount}/{campaign.totalLeads}</span>
                        <Badge className={scfg.color}>{scfg.label}</Badge>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-200 mb-4">Acciones Rápidas</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/search" className="group rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 hover:border-emerald-500/30 hover:bg-zinc-900 transition-all">
            <Search className="h-8 w-8 text-emerald-400 mb-3" />
            <h3 className="font-semibold text-zinc-200 group-hover:text-emerald-400 transition-colors">Nueva Búsqueda</h3>
            <p className="text-sm text-zinc-500 mt-1">Scrapea leads de Google Maps, LinkedIn, Instagram o Facebook</p>
          </Link>
          <Link href="/campaigns/new" className="group rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 hover:border-blue-500/30 hover:bg-zinc-900 transition-all">
            <Megaphone className="h-8 w-8 text-blue-400 mb-3" />
            <h3 className="font-semibold text-zinc-200 group-hover:text-blue-400 transition-colors">Crear Campaña</h3>
            <p className="text-sm text-zinc-500 mt-1">Envía mensajes masivos por Email o WhatsApp</p>
          </Link>
          <Link href="/outreach" className="group rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 hover:border-violet-500/30 hover:bg-zinc-900 transition-all">
            <Send className="h-8 w-8 text-violet-400 mb-3" />
            <h3 className="font-semibold text-zinc-200 group-hover:text-violet-400 transition-colors">Outreach Manual</h3>
            <p className="text-sm text-zinc-500 mt-1">Envía mensajes 1-a-1 por LinkedIn o Instagram</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
