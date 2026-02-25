"use client";

import { useState } from "react";
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
  Star,
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

interface ResultsTableProps {
  leads: Lead[];
  pagination: Pagination;
  selectedIds: Set<string>;
  onSelectChange: (ids: Set<string>) => void;
  onPageChange: (page: number) => void;
  onLeadClick?: (lead: Lead) => void;
}

const sourceLabels: Record<string, { label: string; color: string }> = {
  google_maps: { label: "Google Maps", color: "bg-emerald-500/20 text-emerald-400" },
  linkedin: { label: "LinkedIn", color: "bg-blue-500/20 text-blue-400" },
  instagram: { label: "Instagram", color: "bg-pink-500/20 text-pink-400" },
  facebook: { label: "Facebook", color: "bg-indigo-500/20 text-indigo-400" },
  apify: { label: "Apify (legacy)", color: "bg-amber-500/20 text-amber-400" },
  manual: { label: "Manual", color: "bg-violet-500/20 text-violet-400" },
  csv_import: { label: "Importado", color: "bg-cyan-500/20 text-cyan-400" },
};

export function ResultsTable({
  leads,
  pagination,
  selectedIds,
  onSelectChange,
  onPageChange,
  onLeadClick,
}: ResultsTableProps) {
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
        <p className="text-zinc-500 text-lg font-medium">No hay leads aún</p>
        <p className="text-zinc-600 text-sm mt-1">
          Realiza una búsqueda para ver resultados aquí
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
              <TableHead className="text-zinc-400">Teléfono</TableHead>
              <TableHead className="text-zinc-400">Email</TableHead>
              <TableHead className="text-zinc-400">Website</TableHead>
              <TableHead className="text-zinc-400">Ciudad</TableHead>
              <TableHead className="text-zinc-400">Rating</TableHead>
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
                  className="border-zinc-800 hover:bg-zinc-900/50 cursor-pointer"
                  onClick={() => onLeadClick?.(lead)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(lead.id)}
                      onCheckedChange={() => toggleOne(lead.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-zinc-200">
                        {lead.businessName || lead.contactPerson || "Sin nombre"}
                      </p>
                      {lead.category && (
                        <p className="text-xs text-zinc-500">{lead.category}</p>
                      )}
                      {lead.listItems && lead.listItems.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {lead.listItems.map((item) => (
                            <span
                              key={item.list.id}
                              className="text-[10px] px-1.5 py-0.5 rounded"
                              style={{
                                backgroundColor: `${item.list.color || "#3B82F6"}20`,
                                color: item.list.color || "#3B82F6",
                              }}
                            >
                              {item.list.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={srcConfig.color}>{srcConfig.label}</Badge>
                  </TableCell>
                  {/* Teléfono */}
                  <TableCell>
                    {lead.phone ? (
                      <span className="flex items-center gap-1 text-xs text-zinc-400">
                        <Phone className="h-3 w-3 shrink-0" />
                        {lead.phone}
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-600">—</span>
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
                      <span className="text-xs text-zinc-600">—</span>
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
                      <span className="text-xs text-zinc-600">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-zinc-400 text-sm">
                    {lead.city || "—"}
                  </TableCell>
                  <TableCell>
                    {lead.rating ? (
                      <span className="flex items-center gap-1 text-sm text-zinc-300">
                        <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                        {lead.rating}
                        {lead.reviewsCount && (
                          <span className="text-zinc-500">
                            ({lead.reviewsCount})
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {lead.profileUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="text-zinc-400 hover:text-emerald-400"
                      >
                        <a
                          href={lead.profileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
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
            Página {pagination.page} de {pagination.totalPages}
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
