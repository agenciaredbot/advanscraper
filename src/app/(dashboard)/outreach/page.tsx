"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Send,
  Linkedin,
  Instagram,
  Copy,
  ExternalLink,
  Bot,
  Loader2,
  CheckCircle,
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Users,
} from "lucide-react";
import { toast } from "sonner";

interface Lead {
  id: string;
  source: string;
  businessName: string | null;
  contactPerson: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  category: string | null;
  profileUrl: string | null;
  bio: string | null;
  rating: number | null;
}

interface OutreachLogEntry {
  id: string;
  channel: string;
  action: string;
  messagePreview: string | null;
  status: string;
  sentAt: string;
  lead: {
    businessName: string | null;
    contactPerson: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    profileUrl: string | null;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function OutreachPage() {
  const [activeTab, setActiveTab] = useState("manual");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [channel, setChannel] = useState("linkedin");
  const [message, setMessage] = useState("");
  const [shortMessage, setShortMessage] = useState("");
  const [generating, setGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [templateBase, setTemplateBase] = useState("");

  // Outreach log
  const [logs, setLogs] = useState<OutreachLogEntry[]>([]);
  const [logPagination, setLogPagination] = useState<Pagination>({
    page: 1, limit: 20, total: 0, totalPages: 0,
  });
  const [logLoading, setLogLoading] = useState(false);

  // Search leads
  const searchLeads = async () => {
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (searchQuery) params.set("search", searchQuery);
      if (channel === "linkedin") params.set("source", "linkedin");
      if (channel === "instagram") params.set("source", "instagram");

      const res = await fetch(`/api/leads?${params}`);
      const data = await res.json();
      setLeads(data.leads || []);
    } catch {
      toast.error("Error buscando leads");
    }
  };

  useEffect(() => {
    searchLeads();
  }, [channel]);

  // Fetch outreach log
  const fetchLogs = useCallback(async (page = 1) => {
    setLogLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });
      const res = await fetch(`/api/outreach/log?${params}`);
      const data = await res.json();
      setLogs(data.logs || []);
      setLogPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
    } catch {
      // ignore
    } finally {
      setLogLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "history") fetchLogs(1);
  }, [activeTab, fetchLogs]);

  // Generate AI message
  const handleGenerate = async () => {
    if (!selectedLead) {
      toast.error("Selecciona un lead primero");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          templateBase: templateBase || `Hola {{nombre}}, vi tu perfil y me gustaría conectar contigo.`,
          lead: {
            businessName: selectedLead.businessName,
            contactPerson: selectedLead.contactPerson,
            firstName: selectedLead.firstName,
            lastName: selectedLead.lastName,
            city: selectedLead.city,
            category: selectedLead.category,
            rating: selectedLead.rating,
            bio: selectedLead.bio,
            profileUrl: selectedLead.profileUrl,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error generando mensaje");
      }

      const data = await res.json();
      setMessage(data.messageLong || "");
      if (data.messageShort) setShortMessage(data.messageShort);
      toast.success("Mensaje generado con IA");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error generando");
    } finally {
      setGenerating(false);
    }
  };

  // Copy message and open profile
  const handleCopyAndOpen = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Mensaje copiado al portapapeles");

      // Open profile
      if (selectedLead?.profileUrl) {
        window.open(selectedLead.profileUrl, "_blank");
      }

      // Log the outreach
      if (selectedLead) {
        await fetch("/api/outreach/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leadId: selectedLead.id,
            channel,
            action: `${channel}_message_copied`,
            messagePreview: text.substring(0, 200),
          }),
        });
      }
    } catch {
      toast.error("Error copiando mensaje");
    }
  };

  // Open DM link (Instagram)
  const handleOpenDM = () => {
    if (!selectedLead?.profileUrl) return;
    const username = selectedLead.profileUrl.split("/").filter(Boolean).pop();
    if (username) {
      window.open(`https://ig.me/m/${username}`, "_blank");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-zinc-100">Outreach</h1>
        <p className="mt-1 text-zinc-400">
          Envía mensajes personalizados 1-a-1 por LinkedIn o Instagram
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-zinc-800 border-zinc-700">
          <TabsTrigger value="manual" className="data-[state=active]:bg-zinc-700">
            <Send className="mr-2 h-4 w-4" />
            Outreach Manual
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-zinc-700">
            <Clock className="mr-2 h-4 w-4" />
            Historial
          </TabsTrigger>
        </TabsList>

        {/* Manual Outreach */}
        <TabsContent value="manual" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Left: Lead selector */}
            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardHeader>
                <CardTitle className="text-zinc-100 flex items-center gap-2">
                  <Users className="h-5 w-5 text-emerald-400" />
                  Seleccionar Lead
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Channel */}
                <div className="flex gap-2">
                  <Button
                    variant={channel === "linkedin" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setChannel("linkedin")}
                    className={
                      channel === "linkedin"
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "border-zinc-700 text-zinc-400"
                    }
                  >
                    <Linkedin className="mr-2 h-4 w-4" />
                    LinkedIn
                  </Button>
                  <Button
                    variant={channel === "instagram" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setChannel("instagram")}
                    className={
                      channel === "instagram"
                        ? "bg-pink-600 hover:bg-pink-700"
                        : "border-zinc-700 text-zinc-400"
                    }
                  >
                    <Instagram className="mr-2 h-4 w-4" />
                    Instagram
                  </Button>
                </div>

                {/* Search */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Buscar leads..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && searchLeads()}
                    className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={searchLeads}
                    className="border-zinc-700 text-zinc-400"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>

                {/* Lead list */}
                <div className="max-h-[400px] overflow-y-auto space-y-1 rounded-lg border border-zinc-800 p-2">
                  {leads.length === 0 ? (
                    <p className="text-center text-zinc-500 text-sm py-6">
                      No hay leads de {channel === "linkedin" ? "LinkedIn" : "Instagram"}
                    </p>
                  ) : (
                    leads.map((lead) => (
                      <button
                        key={lead.id}
                        onClick={() => {
                          setSelectedLead(lead);
                          setMessage("");
                          setShortMessage("");
                        }}
                        className={`w-full text-left rounded-md px-3 py-2 transition-all ${
                          selectedLead?.id === lead.id
                            ? "bg-emerald-500/10 border border-emerald-500/30"
                            : "hover:bg-zinc-800/50 border border-transparent"
                        }`}
                      >
                        <p className="text-sm text-zinc-200 truncate">
                          {lead.firstName || lead.contactPerson || lead.businessName || "Sin nombre"}
                        </p>
                        <p className="text-xs text-zinc-500 truncate">
                          {lead.city || lead.category || lead.profileUrl || "—"}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Right: Message */}
            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardHeader>
                <CardTitle className="text-zinc-100 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-emerald-400" />
                  Mensaje
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedLead ? (
                  <>
                    {/* Selected lead info */}
                    <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 p-3">
                      <p className="text-sm font-medium text-zinc-200">
                        {selectedLead.firstName || selectedLead.contactPerson || selectedLead.businessName}
                      </p>
                      <p className="text-xs text-zinc-500">{selectedLead.city} · {selectedLead.category}</p>
                      {selectedLead.profileUrl && (
                        <a
                          href={selectedLead.profileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-emerald-400 hover:underline flex items-center gap-1 mt-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Ver perfil
                        </a>
                      )}
                    </div>

                    {/* Template base for AI */}
                    <div className="space-y-2">
                      <Label className="text-zinc-400 text-xs">
                        Base del mensaje (para IA)
                      </Label>
                      <Textarea
                        value={templateBase}
                        onChange={(e) => setTemplateBase(e.target.value)}
                        placeholder="Ej: Hola, vi tu perfil y tengo una propuesta de marketing digital..."
                        rows={2}
                        className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGenerate}
                        disabled={generating}
                        className="border-violet-500/50 text-violet-400 hover:bg-violet-500/10"
                      >
                        {generating ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Bot className="mr-2 h-4 w-4" />
                        )}
                        Generar con IA
                      </Button>
                    </div>

                    {/* LinkedIn short message */}
                    {channel === "linkedin" && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-zinc-400 text-xs">
                            Nota de Conexión (max 300 chars)
                          </Label>
                          <span
                            className={`text-xs ${
                              shortMessage.length > 300 ? "text-red-400" : "text-zinc-500"
                            }`}
                          >
                            {shortMessage.length}/300
                          </span>
                        </div>
                        <Textarea
                          value={shortMessage}
                          onChange={(e) => setShortMessage(e.target.value)}
                          placeholder="Mensaje corto para nota de conexión..."
                          rows={2}
                          className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleCopyAndOpen(shortMessage)}
                          disabled={!shortMessage}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copiar + Abrir Perfil
                        </Button>
                      </div>
                    )}

                    {/* Full message */}
                    <div className="space-y-2">
                      <Label className="text-zinc-400 text-xs">
                        {channel === "linkedin" ? "Mensaje InMail" : "Mensaje DM"}
                      </Label>
                      <Textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder={`Escribe tu mensaje de ${channel === "linkedin" ? "LinkedIn" : "Instagram"}...`}
                        rows={5}
                        className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleCopyAndOpen(message)}
                        disabled={!message}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1"
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copiar + Abrir Perfil
                      </Button>
                      {channel === "instagram" && (
                        <Button
                          variant="outline"
                          onClick={handleOpenDM}
                          className="border-pink-500/50 text-pink-400 hover:bg-pink-500/10"
                        >
                          <Instagram className="mr-2 h-4 w-4" />
                          Abrir DM
                        </Button>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Send className="h-10 w-10 text-zinc-600 mb-3" />
                    <p className="text-zinc-500 text-sm">
                      Selecciona un lead para empezar
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* History */}
        <TabsContent value="history" className="space-y-4">
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader>
              <CardTitle className="text-zinc-100">Historial de Outreach</CardTitle>
            </CardHeader>
            <CardContent>
              {logLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
                </div>
              ) : logs.length === 0 ? (
                <p className="text-center text-zinc-500 text-sm py-8">
                  No hay registros de outreach aún
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-lg border border-zinc-800 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-zinc-800 hover:bg-transparent">
                          <TableHead className="text-zinc-400">Lead</TableHead>
                          <TableHead className="text-zinc-400">Canal</TableHead>
                          <TableHead className="text-zinc-400">Acción</TableHead>
                          <TableHead className="text-zinc-400">Mensaje</TableHead>
                          <TableHead className="text-zinc-400">Fecha</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {logs.map((log) => {
                          const channelColors: Record<string, string> = {
                            email: "bg-emerald-500/20 text-emerald-400",
                            whatsapp: "bg-green-500/20 text-green-400",
                            linkedin: "bg-blue-500/20 text-blue-400",
                            instagram: "bg-pink-500/20 text-pink-400",
                          };

                          return (
                            <TableRow key={log.id} className="border-zinc-800">
                              <TableCell>
                                <p className="text-sm text-zinc-200">
                                  {log.lead.firstName || log.lead.contactPerson || log.lead.businessName || "—"}
                                </p>
                              </TableCell>
                              <TableCell>
                                <Badge className={channelColors[log.channel] || "bg-zinc-500/20 text-zinc-400"}>
                                  {log.channel}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-zinc-400">
                                {log.action.replace(/_/g, " ")}
                              </TableCell>
                              <TableCell className="text-sm text-zinc-500 max-w-[200px] truncate">
                                {log.messagePreview || "—"}
                              </TableCell>
                              <TableCell className="text-xs text-zinc-500">
                                {new Date(log.sentAt).toLocaleString("es-CO")}
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
                      {logPagination.total} registros
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchLogs(logPagination.page - 1)}
                        disabled={logPagination.page <= 1}
                        className="border-zinc-700 text-zinc-400"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm text-zinc-400">
                        {logPagination.page} / {logPagination.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchLogs(logPagination.page + 1)}
                        disabled={logPagination.page >= logPagination.totalPages}
                        className="border-zinc-700 text-zinc-400"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
