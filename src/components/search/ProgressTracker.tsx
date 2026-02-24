"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, Ban } from "lucide-react";

interface JobProgress {
  phase: string;
  current: number;
  total: number;
  message: string;
}

interface JobData {
  id: string;
  status: string;
  progress: JobProgress;
  error?: string;
  result?: { count: number };
}

interface ProgressTrackerProps {
  jobId: string;
  onComplete?: (result: unknown) => void;
  onCancel?: () => void;
}

export function ProgressTracker({ jobId, onComplete, onCancel }: ProgressTrackerProps) {
  const [job, setJob] = useState<JobData | null>(null);
  const [polling, setPolling] = useState(true);

  useEffect(() => {
    if (!jobId || !polling) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        if (!res.ok) return;
        const data: JobData = await res.json();
        setJob(data);

        if (data.status === "completed" || data.status === "failed" || data.status === "cancelled") {
          setPolling(false);
          if (data.status === "completed" && onComplete) {
            onComplete(data.result);
          }
        }
      } catch {
        // Network error, keep polling
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [jobId, polling, onComplete]);

  const handleCancel = async () => {
    try {
      await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
      onCancel?.();
    } catch {
      // Error cancelling
    }
  };

  if (!job) {
    return (
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-400 mr-2" />
          <span className="text-zinc-400">Conectando con el job...</span>
        </CardContent>
      </Card>
    );
  }

  const progress =
    job.progress.total > 0
      ? (job.progress.current / job.progress.total) * 100
      : 0;

  const statusConfig: Record<string, { icon: React.ReactNode; badge: string; color: string }> = {
    pending: {
      icon: <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />,
      badge: "Pendiente",
      color: "bg-zinc-500/20 text-zinc-400",
    },
    running: {
      icon: <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />,
      badge: "En progreso",
      color: "bg-emerald-500/20 text-emerald-400",
    },
    completed: {
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-400" />,
      badge: "Completado",
      color: "bg-emerald-500/20 text-emerald-400",
    },
    failed: {
      icon: <XCircle className="h-5 w-5 text-red-400" />,
      badge: "Error",
      color: "bg-red-500/20 text-red-400",
    },
    cancelled: {
      icon: <Ban className="h-5 w-5 text-amber-400" />,
      badge: "Cancelado",
      color: "bg-amber-500/20 text-amber-400",
    },
  };

  const config = statusConfig[job.status] || statusConfig.pending;

  return (
    <Card className="border-zinc-800 bg-zinc-900/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-zinc-100 text-lg">
          {config.icon}
          {job.progress.phase}
        </CardTitle>
        <Badge className={config.color}>{config.badge}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">{job.progress.message}</span>
            {job.progress.total > 0 && (
              <span className="text-zinc-500">
                {job.progress.current}/{job.progress.total}
              </span>
            )}
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {job.error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
            {job.error}
          </div>
        )}

        {job.status === "completed" && job.result && (
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm text-emerald-400">
            ¡{job.result.count} leads encontrados!
          </div>
        )}

        {(job.status === "running" || job.status === "pending") && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            className="border-zinc-700 text-zinc-400 hover:text-red-400 hover:border-red-500/30"
          >
            <Ban className="mr-2 h-3 w-3" />
            Cancelar
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
