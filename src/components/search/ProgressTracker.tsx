"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, Clock, Mail } from "lucide-react";

interface StatusResponse {
  status: "running" | "completed" | "failed";
  phase?: string;
  count?: number;
  enrichedEmails?: number;
  message?: string;
  error?: string;
  progress?: {
    itemCount: number;
    durationSecs: number;
  };
}

interface ProgressTrackerProps {
  searchId: string;
  onComplete?: (count: number) => void;
  onError?: (error: string) => void;
}

const PHASE_LABELS: Record<string, string> = {
  scraping: "Scrapeando datos",
  enriching_pages: "Extrayendo datos de contacto",
  enriching: "Enriqueciendo emails",
  done: "Completado",
};

export function ProgressTracker({ searchId, onComplete, onError }: ProgressTrackerProps) {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [polling, setPolling] = useState(true);

  // Elapsed time counter
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Poll /api/scrape/status every 3 seconds
  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/scrape/status?searchId=${searchId}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Error de conexión" }));
        setData({ status: "failed", error: errData.error });
        setPolling(false);
        onError?.(errData.error);
        return;
      }

      const statusData: StatusResponse = await res.json();
      setData(statusData);

      if (statusData.status === "completed") {
        setPolling(false);
        onComplete?.(statusData.count || 0);
      } else if (statusData.status === "failed") {
        setPolling(false);
        onError?.(statusData.error || "Error desconocido");
      }
    } catch {
      // Network error — keep polling
    }
  }, [searchId, onComplete, onError]);

  useEffect(() => {
    if (!searchId || !polling) return;

    // First poll immediately
    poll();

    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [searchId, polling, poll]);

  const phase = data?.phase || "scraping";
  const isRunning = !data || data.status === "running";
  const isCompleted = data?.status === "completed";
  const isFailed = data?.status === "failed";

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <Card className="border-zinc-800 bg-zinc-900/50">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-zinc-100 text-lg">
          {isRunning && <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />}
          {isCompleted && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
          {isFailed && <XCircle className="h-5 w-5 text-red-400" />}
          {isRunning
            ? PHASE_LABELS[phase] || "Procesando..."
            : isCompleted
              ? "Búsqueda completada"
              : "Error en búsqueda"}
        </CardTitle>
        <div className="flex items-center gap-2">
          {isRunning && (
            <Badge className="bg-emerald-500/20 text-emerald-400 border-0">
              En progreso
            </Badge>
          )}
          {isCompleted && (
            <Badge className="bg-emerald-500/20 text-emerald-400 border-0">
              Completado
            </Badge>
          )}
          {isFailed && (
            <Badge className="bg-red-500/20 text-red-400 border-0">
              Error
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress info */}
        {isRunning && (
          <div className="space-y-3">
            {/* Indeterminate progress animation */}
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-zinc-800">
              <div className="absolute h-full w-1/3 animate-pulse rounded-full bg-emerald-500/60"
                style={{
                  animation: "indeterminate 1.5s ease-in-out infinite",
                }}
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">
                {data?.message || "Iniciando búsqueda..."}
              </span>
              <span className="flex items-center gap-1 text-zinc-500">
                <Clock className="h-3.5 w-3.5" />
                {formatTime(data?.progress?.durationSecs || elapsed)}
              </span>
            </div>

            {data?.progress && data.progress.itemCount > 0 && (
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <span>{data.progress.itemCount} items encontrados</span>
              </div>
            )}

            {phase === "enriching" && data?.count && (
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <Mail className="h-3.5 w-3.5" />
                <span>{data.count} leads guardados, buscando emails en websites...</span>
              </div>
            )}
          </div>
        )}

        {/* Completed state */}
        {isCompleted && (
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4">
            <p className="text-sm text-emerald-400 font-medium">
              {data.message || `¡${data.count} leads encontrados!`}
            </p>
            {data.enrichedEmails && data.enrichedEmails > 0 && (
              <p className="text-xs text-emerald-400/70 mt-1">
                {data.enrichedEmails} emails encontrados via websites
              </p>
            )}
          </div>
        )}

        {/* Error state */}
        {isFailed && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4">
            <p className="text-sm text-red-400">
              {data?.error || "Error desconocido"}
            </p>
          </div>
        )}

        {/* Helpful tip for long searches */}
        {isRunning && elapsed > 30 && (
          <p className="text-xs text-zinc-600">
            Las búsquedas grandes pueden tomar varios minutos. No es necesario cerrar esta pestaña.
          </p>
        )}
      </CardContent>

      {/* CSS for indeterminate animation */}
      <style jsx>{`
        @keyframes indeterminate {
          0% { left: -33%; }
          100% { left: 100%; }
        }
      `}</style>
    </Card>
  );
}
