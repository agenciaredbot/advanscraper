"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, X, StickyNote } from "lucide-react";
import { toast } from "sonner";

interface Note {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface NotesSectionProps {
  leadId: string;
  maxNotes?: number;
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

export function NotesSection({ leadId, maxNotes }: NotesSectionProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch(`/api/leads/${leadId}/notes`);
      if (res.ok) {
        const data = await res.json();
        setNotes(data);
      }
    } catch {
      // silent
    } finally {
      setFetching(false);
    }
  }, [leadId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/leads/${leadId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newNote.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al crear nota");
      }

      setNewNote("");
      toast.success("Nota agregada");
      await fetchNotes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear nota");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    setDeletingId(noteId);

    try {
      const res = await fetch(`/api/leads/${leadId}/notes/${noteId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Error al eliminar nota");

      toast.success("Nota eliminada");
      await fetchNotes();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al eliminar nota"
      );
    } finally {
      setDeletingId(null);
    }
  };

  const displayedNotes = maxNotes ? notes.slice(0, maxNotes) : notes;

  return (
    <div className="space-y-4">
      {/* Add note form */}
      <div className="space-y-2">
        <Textarea
          placeholder="Escribe una nota..."
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 min-h-[80px] resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              handleAddNote();
            }
          }}
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleAddNote}
            disabled={loading || !newNote.trim()}
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
            ) : (
              <StickyNote className="h-3.5 w-3.5 mr-1" />
            )}
            Agregar nota
          </Button>
        </div>
      </div>

      {/* Notes list */}
      {fetching ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
        </div>
      ) : displayedNotes.length === 0 ? (
        <div className="text-center py-8">
          <StickyNote className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
          <p className="text-sm text-zinc-500">No hay notas aun</p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayedNotes.map((note) => (
            <div
              key={note.id}
              className="group relative rounded-lg border border-zinc-800 bg-zinc-900/50 p-3"
            >
              <p className="text-sm text-zinc-300 whitespace-pre-wrap pr-6">
                {note.content}
              </p>
              <p className="text-xs text-zinc-600 mt-2">
                {formatRelativeTime(note.createdAt)}
              </p>
              <button
                onClick={() => handleDeleteNote(note.id)}
                disabled={deletingId === note.id}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-600 hover:text-red-400"
              >
                {deletingId === note.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <X className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
