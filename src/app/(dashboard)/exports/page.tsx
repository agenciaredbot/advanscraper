"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Download,
  FileSpreadsheet,
  Loader2,
  FileDown,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";

interface LeadList {
  id: string;
  name: string;
  color: string | null;
  _count?: { items: number };
}

interface ExportRecord {
  id: string;
  exportType: string;
  fileName: string | null;
  totalLeads: number;
  createdAt: string;
}

export default function ExportsPage() {
  const [lists, setLists] = useState<LeadList[]>([]);
  const [exports, setExports] = useState<ExportRecord[]>([]);
  const [selectedListId, setSelectedListId] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/lists").then((r) => r.json()).catch(() => []),
    ]).then(([listsData]) => {
      setLists(Array.isArray(listsData) ? listsData : []);
      setLoading(false);
    });
  }, []);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const body: Record<string, string> = {};
      if (selectedListId !== "all") body.listId = selectedListId;
      if (sourceFilter !== "all") body.source = sourceFilter;

      const res = await fetch("/api/exports/csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error exportando");
      }

      // Get the CSV data
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leads-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("CSV exportado exitosamente");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al exportar");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-zinc-100">Exports</h1>
        <p className="mt-1 text-zinc-400">
          Exporta tus leads a CSV
        </p>
      </div>

      {/* Export Options */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="text-zinc-100 flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
            Exportar Leads
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Source filter */}
            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Fuente</label>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las fuentes</SelectItem>
                  <SelectItem value="google_maps">Google Maps</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="apify">Apify</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* List filter */}
            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Lista</label>
              <Select value={selectedListId} onValueChange={setSelectedListId}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los leads</SelectItem>
                  {lists.map((list) => (
                    <SelectItem key={list.id} value={list.id}>
                      {list.name}
                      {list._count && ` (${list._count.items})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Export button */}
            <div className="space-y-2">
              <label className="text-sm text-zinc-400">&nbsp;</label>
              <Button
                onClick={handleExportCSV}
                disabled={exporting}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {exporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileDown className="mr-2 h-4 w-4" />
                )}
                Exportar CSV
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 p-4">
            <p className="text-xs text-zinc-400">
              El CSV incluye: Nombre del negocio, Contacto, Email, Teléfono, Website,
              Ciudad, Categoría, Rating, Fuente, URL del perfil, Fecha de scraping.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Google Sheets info */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-blue-500/10 p-3">
              <FileSpreadsheet className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-zinc-200">
                Google Sheets (Próximamente)
              </h3>
              <p className="text-xs text-zinc-500 mt-1">
                Exporta directamente a Google Sheets conectando tu cuenta de Google.
                Configúralo en Settings.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
