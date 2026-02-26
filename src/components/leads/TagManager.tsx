"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

const PRESET_COLORS = [
  "#10B981", // emerald
  "#3B82F6", // blue
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#F59E0B", // amber
  "#EF4444", // red
  "#06B6D4", // cyan
  "#71717A", // zinc
];

interface TagManagerProps {
  leadId: string;
  currentTags: Array<{ id: string; name: string; color: string }>;
  onTagsChanged?: () => void;
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

export function TagManager({
  leadId,
  currentTags,
  onTagsChanged,
}: TagManagerProps) {
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [search, setSearch] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(PRESET_COLORS[0]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchAllTags = useCallback(async () => {
    try {
      const res = await fetch("/api/tags");
      if (res.ok) {
        const data = await res.json();
        setAllTags(data);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchAllTags();
    }
  }, [open, fetchAllTags]);

  const currentTagIds = new Set(currentTags.map((t) => t.id));

  const filteredTags = allTags.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggleTag = async (tag: Tag) => {
    const isAssigned = currentTagIds.has(tag.id);
    setLoading(true);

    try {
      if (isAssigned) {
        const res = await fetch(`/api/leads/${leadId}/tags`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tagIds: [tag.id] }),
        });
        if (!res.ok) throw new Error("Error al remover tag");
      } else {
        const res = await fetch(`/api/leads/${leadId}/tags`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tagIds: [tag.id] }),
        });
        if (!res.ok) throw new Error("Error al asignar tag");
      }
      onTagsChanged?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error con tags");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/tags`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagIds: [tagId] }),
      });
      if (!res.ok) throw new Error("Error al remover tag");
      onTagsChanged?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al remover tag");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/leads/${leadId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagName: newTagName.trim(), color: newTagColor }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al crear tag");
      }

      setNewTagName("");
      setNewTagColor(PRESET_COLORS[0]);
      await fetchAllTags();
      onTagsChanged?.();
      toast.success("Tag creado y asignado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear tag");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Current tags as colored badges */}
      {currentTags.map((tag) => (
        <span
          key={tag.id}
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={{
            backgroundColor: `${tag.color}20`,
            color: tag.color,
          }}
        >
          {tag.name}
          <button
            onClick={() => handleRemoveTag(tag.id)}
            className="ml-0.5 hover:opacity-70 transition-opacity"
            disabled={loading}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}

      {/* Add tag popover */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 rounded-full text-zinc-500 hover:text-emerald-400 hover:bg-zinc-800"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-72 bg-zinc-900 border-zinc-700 p-3"
          align="start"
        >
          {/* Search existing tags */}
          <Input
            placeholder="Buscar tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-2 h-8 bg-zinc-800 border-zinc-700 text-zinc-100 text-sm placeholder:text-zinc-500"
          />

          {/* Tag list with checkboxes */}
          <div className="max-h-40 overflow-y-auto space-y-1 mb-3">
            {filteredTags.length === 0 && (
              <p className="text-xs text-zinc-500 py-2 text-center">
                No se encontraron tags
              </p>
            )}
            {filteredTags.map((tag) => (
              <label
                key={tag.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-zinc-800 cursor-pointer transition-colors"
              >
                <Checkbox
                  checked={currentTagIds.has(tag.id)}
                  onCheckedChange={() => handleToggleTag(tag)}
                  disabled={loading}
                />
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: tag.color }}
                />
                <span className="text-sm text-zinc-300 truncate">
                  {tag.name}
                </span>
              </label>
            ))}
          </div>

          {/* Create new tag section */}
          <div className="border-t border-zinc-700 pt-3">
            <p className="text-xs text-zinc-500 mb-2 font-medium">
              Crear nuevo tag
            </p>
            <Input
              placeholder="Nombre del tag..."
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              className="mb-2 h-8 bg-zinc-800 border-zinc-700 text-zinc-100 text-sm placeholder:text-zinc-500"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateTag();
              }}
            />
            <div className="flex items-center gap-1.5 mb-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  className="h-5 w-5 rounded-full transition-all shrink-0"
                  style={{
                    backgroundColor: color,
                    outline:
                      newTagColor === color
                        ? `2px solid ${color}`
                        : "2px solid transparent",
                    outlineOffset: "2px",
                  }}
                  onClick={() => setNewTagColor(color)}
                />
              ))}
            </div>
            <Button
              size="sm"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-8"
              onClick={handleCreateTag}
              disabled={loading || !newTagName.trim()}
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : null}
              Crear
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
