"use client";

import { useEffect, useState, useCallback } from "react";
import { ResultsTable } from "@/components/results/ResultsTable";
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
import { Search, Download, Loader2, ListFilter, Trash2 } from "lucide-react";
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
  scrapedAt: string;
  listItems?: Array<{
    list: { id: string; name: string; color: string | null };
  }>;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function ResultsPage() {
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
  const [showAddToList, setShowAddToList] = useState(false);

  const fetchLeads = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });

      if (searchQuery) params.set("search", searchQuery);
      if (sourceFilter !== "all") params.set("source", sourceFilter);
      if (hasEmailFilter === "yes") params.set("hasEmail", "true");
      if (hasEmailFilter === "phone") params.set("hasPhone", "true");

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
  }, [searchQuery, sourceFilter, hasEmailFilter]);

  useEffect(() => {
    fetchLeads(1);
  }, [fetchLeads]);

  const handleExportCSV = async () => {
    try {
      const body: Record<string, unknown> = {};
      if (selectedIds.size > 0) body.leadIds = Array.from(selectedIds);
      if (sourceFilter !== "all") body.source = sourceFilter;

      const res = await fetch("/api/exports/csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Error exportando");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("CSV exportado");
    } catch {
      toast.error("Error al exportar CSV");
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`¿Eliminar ${selectedIds.size} leads seleccionados?`)) return;

    try {
      const promises = Array.from(selectedIds).map((id) =>
        fetch(`/api/leads/${id}`, { method: "DELETE" })
      );
      await Promise.all(promises);
      toast.success(`${selectedIds.size} leads eliminados`);
      setSelectedIds(new Set());
      fetchLeads(pagination.page);
    } catch {
      toast.error("Error al eliminar leads");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100">Resultados</h1>
          <p className="mt-1 text-zinc-400">
            {pagination.total} leads encontrados
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
                onClick={() => setShowAddToList(true)}
                className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
              >
                <ListFilter className="mr-2 h-4 w-4" />
                Agregar a Lista
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteSelected}
                className="border-red-500/50 text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="border-zinc-700 text-zinc-400"
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Buscar por nombre, email, categoría..."
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
            <SelectItem value="apify">Apify</SelectItem>
          </SelectContent>
        </Select>
        <Select value={hasEmailFilter} onValueChange={(v) => { setHasEmailFilter(v); }}>
          <SelectTrigger className="w-[160px] bg-zinc-800 border-zinc-700 text-zinc-300">
            <SelectValue placeholder="Contacto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todo</SelectItem>
            <SelectItem value="yes">Con email</SelectItem>
            <SelectItem value="phone">Con teléfono</SelectItem>
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
        <ResultsTable
          leads={leads}
          pagination={pagination}
          selectedIds={selectedIds}
          onSelectChange={setSelectedIds}
          onPageChange={(page) => fetchLeads(page)}
        />
      )}

      {/* Add to List Modal */}
      <AddToListModal
        open={showAddToList}
        onOpenChange={setShowAddToList}
        leadIds={Array.from(selectedIds)}
      />
    </div>
  );
}
