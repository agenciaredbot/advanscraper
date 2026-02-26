"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Mail,
  Phone,
  Globe,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

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

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface LeadsTableProps {
  leads: Lead[];
  pagination: Pagination;
  selectedIds: Set<string>;
  onSelectChange: (ids: Set<string>) => void;
  onPageChange: (page: number) => void;
  onLeadClick: (lead: Lead) => void;
}

const sourceLabels: Record<string, { label: string; color: string }> = {
  google_maps: { label: "Google Maps", color: "bg-emerald-500/20 text-emerald-400" },
  linkedin: { label: "LinkedIn", color: "bg-blue-500/20 text-blue-400" },
  instagram: { label: "Instagram", color: "bg-pink-500/20 text-pink-400" },
  facebook: { label: "Facebook", color: "bg-indigo-500/20 text-indigo-400" },
  manual: { label: "Manual", color: "bg-zinc-500/20 text-zinc-400" },
  csv_import: { label: "Importado", color: "bg-amber-500/20 text-amber-400" },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "--";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "--";
  }
}

export function LeadsTable({
  leads,
  pagination,
  selectedIds,
  onSelectChange,
  onPageChange,
  onLeadClick,
}: LeadsTableProps) {
  const allSelected = leads.length > 0 && leads.every((l) => selectedIds.has(l.id));

  const toggleAll = () => {
    if (allSelected) {
      onSelectChange(new Set());
    } else {
      onSelectChange(new Set(leads.map((l) => l.id)));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onSelectChange(next);
  };

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-900/30 p-16">
        <p className="text-zinc-500 text-lg font-medium">No hay leads guardados</p>
        <p className="text-zinc-600 text-sm mt-1">
          Guarda leads desde la pagina de Resultados para verlos aqui
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-zinc-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800 hover:bg-transparent">
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead className="text-zinc-400">Negocio</TableHead>
              <TableHead className="text-zinc-400">Fuente</TableHead>
              <TableHead className="text-zinc-400">Telefono</TableHead>
              <TableHead className="text-zinc-400">Email</TableHead>
              <TableHead className="text-zinc-400">Website</TableHead>
              <TableHead className="text-zinc-400">Ciudad</TableHead>
              <TableHead className="text-zinc-400">Guardado</TableHead>
              <TableHead className="text-zinc-400">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => {
              const srcConfig = sourceLabels[lead.source] || {
                label: lead.source,
                color: "bg-zinc-500/20 text-zinc-400",
              };

              return (
                <TableRow
                  key={lead.id}
                  className="border-zinc-800 cursor-pointer hover:bg-zinc-800/50"
                  onClick={() => onLeadClick(lead)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(lead.id)}
                      onCheckedChange={() => toggleOne(lead.id)}
                    />
                  </TableCell>
                  {/* Negocio + category + tag badges */}
                  <TableCell>
                    <div>
                      <p className="font-medium text-zinc-200">
                        {lead.businessName || lead.contactPerson || "Sin nombre"}
                      </p>
                      {lead.category && (
                        <p className="text-xs text-zinc-500">{lead.category}</p>
                      )}
                      {lead.tags && lead.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {lead.tags.map((t) => (
                            <span
                              key={t.tag.id}
                              className="text-[10px] px-1.5 py-0.5 rounded"
                              style={{
                                backgroundColor: `${t.tag.color}33`,
                                color: t.tag.color,
                              }}
                            >
                              {t.tag.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  {/* Fuente */}
                  <TableCell>
                    <Badge className={srcConfig.color}>{srcConfig.label}</Badge>
                  </TableCell>
                  {/* Telefono */}
                  <TableCell>
                    {lead.phone ? (
                      <span className="flex items-center gap-1 text-xs text-zinc-400">
                        <Phone className="h-3 w-3 shrink-0" />
                        {lead.phone}
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-600">&mdash;</span>
                    )}
                  </TableCell>
                  {/* Email */}
                  <TableCell>
                    {lead.email ? (
                      <span className="flex items-center gap-1 text-xs text-zinc-400">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate max-w-[180px]">{lead.email}</span>
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-600">&mdash;</span>
                    )}
                  </TableCell>
                  {/* Website */}
                  <TableCell>
                    {lead.website ? (
                      <a
                        href={lead.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 hover:underline"
                      >
                        <Globe className="h-3 w-3 shrink-0" />
                        <span className="truncate max-w-[150px]">
                          {lead.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                        </span>
                      </a>
                    ) : (
                      <span className="text-xs text-zinc-600">&mdash;</span>
                    )}
                  </TableCell>
                  {/* Ciudad */}
                  <TableCell className="text-zinc-400 text-sm">
                    {lead.city || "\u2014"}
                  </TableCell>
                  {/* Guardado (savedAt) */}
                  <TableCell className="text-zinc-500 text-xs whitespace-nowrap">
                    {formatDate(lead.savedAt)}
                  </TableCell>
                  {/* Acciones */}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="text-zinc-400 hover:text-emerald-400"
                    >
                      <a href={`/leads/${lead.id}`}>
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          Mostrando {(pagination.page - 1) * pagination.limit + 1}-
          {Math.min(pagination.page * pagination.limit, pagination.total)} de{" "}
          {pagination.total} leads
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="border-zinc-700 text-zinc-400"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-zinc-400">
            Pagina {pagination.page} de {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
            className="border-zinc-700 text-zinc-400"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
