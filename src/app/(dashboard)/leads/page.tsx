"use client";

import { useEffect, useState, useCallback } from "react";
import { LeadsTable } from "@/components/leads/LeadsTable";
import { LeadDetailSheet } from "@/components/leads/LeadDetailSheet";
import { AddToListModal } from "@/components/lead-lists/AddToListModal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Loader2, Star, StarOff, Tag, ListFilter } from "lucide-react";
import { toast } from "sonner";

interface Lead {
  id: string;
  source: string;
  businessName: string | null;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  city: string | null;
  category: string | null;
  rating: number | null;
  reviewsCount: number | null;
  profileUrl: string | null;
  bio: string | null;
  address: string | null;
  contactTitle: string | null;
  country: string | null;
  followers: number | null;
  isSaved: boolean;
  savedAt: string | null;
  scrapedAt: string;
  tags?: Array<{ tag: { id: string; name: string; color: string } }>;
  notes?: Array<{ id: string; content: string; createdAt: string }>;
  listItems?: Array<{ list: { id: string; name: string; color: string | null } }>;
}

interface TagItem {
  id: string;
  name: string;
  color: string;
  _count: { assignments: number };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [hasEmailFilter, setHasEmailFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [tags, setTags] = useState<TagItem[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showAddToList, setShowAddToList] = useState(false);

  // Fetch tags for the filter dropdown
  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch("/api/tags");
      if (!res.ok) return;
      const data = await res.json();
      setTags(data);
    } catch {
      // Silently fail — tags filter is optional
    }
  }, []);

  const fetchLeads = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        isSaved: "true",
      });

      if (searchQuery) params.set("search", searchQuery);
      if (sourceFilter !== "all") params.set("source", sourceFilter);
      if (hasEmailFilter === "yes") params.set("hasEmail", "true");
      if (hasEmailFilter === "phone") params.set("hasPhone", "true");
      if (tagFilter !== "all") params.set("tagId", tagFilter);

      const res = await fetch(`/api/leads?${params}`);
      if (!res.ok) throw new Error("Error fetching leads");

      const data = await res.json();
      setLeads(data.leads);
      setPagination(data.pagination);
    } catch {
      toast.error("Error al cargar leads");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, sourceFilter, hasEmailFilter, tagFilter]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  useEffect(() => {
    fetchLeads(1);
  }, [fetchLeads]);

  const handleUnsaveSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`¿Quitar ${selectedIds.size} leads de guardados?`)) return;

    try {
      const res = await fetch("/api/leads/save", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds: Array.from(selectedIds) }),
      });

      if (!res.ok) throw new Error("Error removing leads");

      toast.success(`${selectedIds.size} leads removidos de guardados`);
      setSelectedIds(new Set());
      fetchLeads(pagination.page);
    } catch {
      toast.error("Error al quitar leads de guardados");
    }
  };

  const handleLeadClick = (lead: Lead) => {
    setSelectedLeadId(lead.id);
    setSheetOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100">Leads</h1>
          <p className="mt-1 text-zinc-400">
            Tus leads guardados &mdash; {pagination.total} en total
          </p>
        </div>
        <div className="flex gap-2">
          {selectedIds.size > 0 && (
            <>
              <span className="text-sm text-emerald-400 self-center mr-2">
                {selectedIds.size} seleccionados
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleUnsaveSelected}
                className="border-red-500/50 text-red-400 hover:bg-red-500/10"
              >
                <StarOff className="mr-2 h-4 w-4" />
                Quitar de Leads
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddToList(true)}
                className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
              >
                <ListFilter className="mr-2 h-4 w-4" />
                Agregar a Lista
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.info("Asignar tags: proximamente")}
                className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
              >
                <Tag className="mr-2 h-4 w-4" />
                Asignar Tags
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Buscar por nombre, email, categoria..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchLeads(1)}
            className="pl-10 bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
          />
        </div>
        <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); }}>
          <SelectTrigger className="w-[160px] bg-zinc-800 border-zinc-700 text-zinc-300">
            <SelectValue placeholder="Fuente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las fuentes</SelectItem>
            <SelectItem value="google_maps">Google Maps</SelectItem>
            <SelectItem value="linkedin">LinkedIn</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
            <SelectItem value="facebook">Facebook</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="csv_import">Importado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={hasEmailFilter} onValueChange={(v) => { setHasEmailFilter(v); }}>
          <SelectTrigger className="w-[160px] bg-zinc-800 border-zinc-700 text-zinc-300">
            <SelectValue placeholder="Contacto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todo</SelectItem>
            <SelectItem value="yes">Con email</SelectItem>
            <SelectItem value="phone">Con telefono</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tagFilter} onValueChange={(v) => { setTagFilter(v); }}>
          <SelectTrigger className="w-[160px] bg-zinc-800 border-zinc-700 text-zinc-300">
            <SelectValue placeholder="Tag" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tags</SelectItem>
            {tags.map((tag) => (
              <SelectItem key={tag.id} value={tag.id}>
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name} ({tag._count.assignments})
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchLeads(1)}
          className="border-zinc-700 text-zinc-400"
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center p-16">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
        </div>
      ) : (
        <LeadsTable
          leads={leads}
          pagination={pagination}
          selectedIds={selectedIds}
          onSelectChange={setSelectedIds}
          onPageChange={(page) => fetchLeads(page)}
          onLeadClick={handleLeadClick}
        />
      )}

      {/* Lead Detail Sheet */}
      <LeadDetailSheet
        leadId={selectedLeadId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onLeadUpdated={() => fetchLeads(pagination.page)}
      />

      {/* Add to List Modal */}
      <AddToListModal
        open={showAddToList}
        onOpenChange={setShowAddToList}
        leadIds={Array.from(selectedIds)}
      />
    </div>
  );
}
