"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Video,
  Plus,
  Trash2,
  ExternalLink,
  Loader2,
  Clock,
  Link2,
  Copy,
} from "lucide-react";
import { toast } from "sonner";

interface LoomVideo {
  id: string;
  shareUrl: string;
  embedUrl: string;
  title: string;
  thumbnailUrl: string;
  duration: number;
  label: string | null;
  createdAt: string;
}

function formatDuration(seconds: number): string {
  if (!seconds) return "";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function VideosPage() {
  const [videos, setVideos] = useState<LoomVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newLabel, setNewLabel] = useState("");

  const fetchVideos = async () => {
    try {
      const res = await fetch("/api/videos/loom");
      if (!res.ok) throw new Error("Error");
      const data = await res.json();
      setVideos(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Error al cargar videos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const handleAdd = async () => {
    if (!newUrl.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/videos/loom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shareUrl: newUrl.trim(), label: newLabel.trim() || null }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error");
      }
      const video = await res.json();
      setVideos((prev) => [video, ...prev]);
      setShowAdd(false);
      setNewUrl("");
      setNewLabel("");
      toast.success("Video agregado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al agregar video");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/videos/loom?id=${id}`, { method: "DELETE" });
      setVideos((prev) => prev.filter((v) => v.id !== id));
      toast.success("Video eliminado");
    } catch {
      toast.error("Error al eliminar");
    }
  };

  const copyUrl = async (url: string) => {
    await navigator.clipboard.writeText(url);
    toast.success("URL copiada");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100">Videos</h1>
          <p className="mt-1 text-zinc-400">
            Biblioteca de videos Loom para incluir en outreach
          </p>
        </div>
        <Button
          onClick={() => setShowAdd(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          Agregar Video
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-16">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
        </div>
      ) : videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-900/30 p-16">
          <Video className="h-12 w-12 text-zinc-600 mb-4" />
          <p className="text-zinc-500 text-lg font-medium">No hay videos aún</p>
          <p className="text-zinc-600 text-sm mt-1">
            Agrega un video Loom para incluir en tus campañas de outreach
          </p>
          <Button
            onClick={() => setShowAdd(true)}
            className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Agregar Video Loom
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <Card key={video.id} className="border-zinc-800 bg-zinc-900/50 overflow-hidden group">
              {/* Thumbnail */}
              <div className="relative aspect-video bg-zinc-800">
                <img
                  src={video.thumbnailUrl}
                  alt={video.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a
                    href={video.shareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white/90 text-black rounded-full p-3 hover:bg-white transition"
                  >
                    <Video className="h-5 w-5" />
                  </a>
                </div>
                {video.duration > 0 && (
                  <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
                    <Clock className="inline h-3 w-3 mr-1" />
                    {formatDuration(video.duration)}
                  </div>
                )}
              </div>

              <CardContent className="pt-3 pb-3">
                <h3 className="font-medium text-zinc-200 text-sm truncate">
                  {video.title}
                </h3>
                {video.label && (
                  <Badge className="mt-1 bg-violet-500/20 text-violet-400 text-[10px]">
                    {video.label}
                  </Badge>
                )}
                <p className="text-xs text-zinc-500 mt-1">
                  {new Date(video.createdAt).toLocaleDateString("es-CO")}
                </p>

                <div className="flex gap-1 mt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyUrl(video.shareUrl)}
                    className="text-zinc-400 hover:text-emerald-400 h-7 text-xs"
                  >
                    <Copy className="mr-1 h-3 w-3" />
                    Copiar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="text-zinc-400 hover:text-blue-400 h-7 text-xs"
                  >
                    <a href={video.shareUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-1 h-3 w-3" />
                      Abrir
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(video.id)}
                    className="text-zinc-400 hover:text-red-400 h-7 text-xs ml-auto"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Video Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Agregar Video Loom</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-zinc-300">URL del Video</Label>
              <Input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://www.loom.com/share/..."
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
              />
              <p className="text-xs text-zinc-500">
                Pega la URL de compartir de Loom
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-300">Etiqueta (opcional)</Label>
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Ej: Demo producto, Video intro..."
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAdd(false)}
              className="border-zinc-700 text-zinc-400"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAdd}
              disabled={adding || !newUrl.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {adding ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Link2 className="mr-2 h-4 w-4" />
              )}
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
