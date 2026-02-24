"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Users, ListFilter, Loader2 } from "lucide-react";

interface Lead {
  id: string;
  businessName: string | null;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  source: string;
}

interface LeadList {
  id: string;
  name: string;
  color: string | null;
  _count?: { items: number };
}

interface LeadSelectorProps {
  channel: string;
  selectedLeadIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export function LeadSelector({
  channel,
  selectedLeadIds,
  onSelectionChange,
}: LeadSelectorProps) {
  const [mode, setMode] = useState<"list" | "filter" | "manual">("list");
  const [lists, setLists] = useState<LeadList[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");

  // Fetch lists
  useEffect(() => {
    fetch("/api/lists")
      .then((r) => r.json())
      .then(setLists)
      .catch(() => {});
  }, []);

  // When list selected, fetch its leads
  useEffect(() => {
    if (mode === "list" && selectedListId) {
      setLoading(true);
      fetch(`/api/lists/${selectedListId}`)
        .then((r) => r.json())
        .then((data) => {
          const listLeads = data.items?.map((item: { lead: Lead }) => item.lead) || [];
          setLeads(listLeads);
          // Auto-select all leads that match channel requirements
          const validIds = listLeads
            .filter((l: Lead) => {
              if (channel === "email") return !!l.email;
              if (channel === "whatsapp") return !!l.phone;
              return true;
            })
            .map((l: Lead) => l.id);
          onSelectionChange(validIds);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [selectedListId, mode, channel]);

  // Fetch leads with filters
  const fetchFilteredLeads = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (searchQuery) params.set("search", searchQuery);
      if (sourceFilter !== "all") params.set("source", sourceFilter);
      if (channel === "email") params.set("hasEmail", "true");
      if (channel === "whatsapp") params.set("hasPhone", "true");

      const res = await fetch(`/api/leads?${params}`);
      const data = await res.json();
      setLeads(data.leads || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mode === "filter") {
      fetchFilteredLeads();
    }
  }, [mode]);

  const toggleLead = (id: string) => {
    const next = selectedLeadIds.includes(id)
      ? selectedLeadIds.filter((x) => x !== id)
      : [...selectedLeadIds, id];
    onSelectionChange(next);
  };

  const toggleAll = () => {
    if (selectedLeadIds.length === leads.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(leads.map((l) => l.id));
    }
  };

  const channelRequirement =
    channel === "email" ? "email" : channel === "whatsapp" ? "teléfono" : "perfil";

  return (
    <Card className="border-zinc-800 bg-zinc-900/50">
      <CardHeader>
        <CardTitle className="text-zinc-100 flex items-center gap-2">
          <Users className="h-5 w-5 text-emerald-400" />
          Seleccionar Leads
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mode selector */}
        <div className="flex gap-2">
          <Button
            variant={mode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("list")}
            className={
              mode === "list"
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "border-zinc-700 text-zinc-400"
            }
          >
            <ListFilter className="mr-2 h-4 w-4" />
            Desde Lista
          </Button>
          <Button
            variant={mode === "filter" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("filter")}
            className={
              mode === "filter"
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "border-zinc-700 text-zinc-400"
            }
          >
            <Search className="mr-2 h-4 w-4" />
            Por Filtros
          </Button>
        </div>

        {/* Mode: List */}
        {mode === "list" && (
          <div className="space-y-3">
            <Select value={selectedListId} onValueChange={setSelectedListId}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-300">
                <SelectValue placeholder="Selecciona una lista..." />
              </SelectTrigger>
              <SelectContent>
                {lists.map((list) => (
                  <SelectItem key={list.id} value={list.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: list.color || "#3B82F6" }}
                      />
                      {list.name}
                      {list._count && (
                        <span className="text-zinc-500 text-xs">
                          ({list._count.items} leads)
                        </span>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Mode: Filter */}
        {mode === "filter" && (
          <div className="flex gap-2">
            <Input
              placeholder={`Buscar leads con ${channelRequirement}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchFilteredLeads()}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
            />
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[150px] bg-zinc-800 border-zinc-700 text-zinc-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="google_maps">Google Maps</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="apify">Apify</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchFilteredLeads}
              className="border-zinc-700 text-zinc-400"
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Leads list */}
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
          </div>
        ) : leads.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <button
                onClick={toggleAll}
                className="text-xs text-emerald-400 hover:underline"
              >
                {selectedLeadIds.length === leads.length
                  ? "Deseleccionar todo"
                  : "Seleccionar todo"}
              </button>
              <Badge className="bg-emerald-500/20 text-emerald-400">
                {selectedLeadIds.length} seleccionados
              </Badge>
            </div>
            <div className="max-h-[300px] overflow-y-auto space-y-1 rounded-lg border border-zinc-800 p-2">
              {leads.map((lead) => {
                const hasRequired =
                  channel === "email"
                    ? !!lead.email
                    : channel === "whatsapp"
                    ? !!lead.phone
                    : true;

                return (
                  <label
                    key={lead.id}
                    className={`flex items-center gap-3 rounded-md px-3 py-2 hover:bg-zinc-800/50 cursor-pointer ${
                      !hasRequired ? "opacity-50" : ""
                    }`}
                  >
                    <Checkbox
                      checked={selectedLeadIds.includes(lead.id)}
                      onCheckedChange={() => toggleLead(lead.id)}
                      disabled={!hasRequired}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-200 truncate">
                        {lead.businessName || lead.contactPerson || "Sin nombre"}
                      </p>
                      <p className="text-xs text-zinc-500 truncate">
                        {channel === "email"
                          ? lead.email || "Sin email"
                          : channel === "whatsapp"
                          ? lead.phone || "Sin teléfono"
                          : lead.city || lead.source}
                      </p>
                    </div>
                    {!hasRequired && (
                      <span className="text-[10px] text-amber-400">
                        Sin {channelRequirement}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-center text-zinc-500 text-sm py-6">
            {mode === "list"
              ? "Selecciona una lista para ver sus leads"
              : "No se encontraron leads con los filtros aplicados"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
