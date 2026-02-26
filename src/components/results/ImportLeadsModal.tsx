"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
  Loader2,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  Mail,
  Phone,
  Globe,
  XCircle,
  ArrowRight,
  EyeOff,
  Columns3,
} from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";
import * as XLSX from "xlsx";

interface ImportLeadsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: () => void;
}

interface ParsedLead {
  businessName?: string;
  contactPerson?: string;
  firstName?: string;
  lastName?: string;
  contactTitle?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  category?: string;
  industry?: string;
  profileUrl?: string;
  linkedinUrl?: string;
  googleMapsUrl?: string;
}

type LeadField = keyof ParsedLead;

// All available target fields with Spanish labels
const FIELD_OPTIONS: Array<{ value: LeadField | "skip"; label: string }> = [
  { value: "skip", label: "Omitir columna" },
  { value: "businessName", label: "Negocio" },
  { value: "firstName", label: "Nombre" },
  { value: "lastName", label: "Apellido" },
  { value: "contactTitle", label: "Cargo" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Teléfono" },
  { value: "website", label: "Website" },
  { value: "address", label: "Dirección" },
  { value: "city", label: "Ciudad" },
  { value: "state", label: "Estado / Provincia" },
  { value: "country", label: "País" },
  { value: "category", label: "Categoría" },
  { value: "industry", label: "Industria / Sector" },
  { value: "profileUrl", label: "URL de Perfil" },
  { value: "linkedinUrl", label: "LinkedIn URL" },
  { value: "googleMapsUrl", label: "Google Maps URL" },
];

// Column name mapping (Spanish + English + snake_case + compound variants → field name)
const COLUMN_MAP: Record<string, LeadField> = {
  // Business name
  negocio: "businessName",
  empresa: "businessName",
  "nombre del negocio": "businessName",
  "nombre empresa": "businessName",
  nombre_empresa: "businessName",
  business: "businessName",
  "business name": "businessName",
  business_name: "businessName",
  company: "businessName",
  company_name: "businessName",
  "company name": "businessName",
  nombre: "firstName",
  // Contact person / First name
  contacto: "firstName",
  "persona de contacto": "firstName",
  "contact person": "firstName",
  contact_person: "firstName",
  contact: "firstName",
  persona: "firstName",
  "first name": "firstName",
  first_name: "firstName",
  firstname: "firstName",
  "nombre de pila": "firstName",
  nombre_de_pila: "firstName",
  contact_first_name: "firstName",
  // Last name
  apellido: "lastName",
  "last name": "lastName",
  last_name: "lastName",
  lastname: "lastName",
  surname: "lastName",
  contact_last_name: "lastName",
  // Contact title / Position
  cargo: "contactTitle",
  titulo: "contactTitle",
  título: "contactTitle",
  title: "contactTitle",
  "job title": "contactTitle",
  job_title: "contactTitle",
  puesto: "contactTitle",
  position: "contactTitle",
  contact_title: "contactTitle",
  titulo_cargo: "contactTitle",
  headline: "contactTitle",
  // Email
  email: "email",
  correo: "email",
  "correo electrónico": "email",
  "correo electronico": "email",
  correo_electronico: "email",
  "e-mail": "email",
  mail: "email",
  email_address: "email",
  "email address": "email",
  contact_email: "email",
  // Phone
  teléfono: "phone",
  telefono: "phone",
  tel: "phone",
  phone: "phone",
  celular: "phone",
  móvil: "phone",
  movil: "phone",
  phone_number: "phone",
  "phone number": "phone",
  phone_no: "phone",
  numero_telefono: "phone",
  contact_phone: "phone",
  mobile: "phone",
  // Website
  website: "website",
  web: "website",
  "sitio web": "website",
  sitio_web: "website",
  url: "website",
  página: "website",
  pagina: "website",
  site_url: "website",
  web_url: "website",
  homepage: "website",
  pagina_web: "website",
  company_website: "website",
  // Address
  dirección: "address",
  direccion: "address",
  address: "address",
  street_address: "address",
  "street address": "address",
  full_address: "address",
  "full address": "address",
  company_street_address: "address",
  company_full_address: "address",
  company_address: "address",
  direccion_empresa: "address",
  // City
  ciudad: "city",
  city: "city",
  company_city: "city",
  // State / Province
  estado: "state",
  state: "state",
  provincia: "state",
  departamento: "state",
  region: "state",
  company_state: "state",
  // Country
  pais: "country",
  "país": "country",
  country: "country",
  company_country: "country",
  // Category
  categoría: "category",
  categoria: "category",
  category: "category",
  rubro: "category",
  company_category: "category",
  tipo_negocio: "category",
  // Industry / Sector
  industria: "industry",
  industry: "industry",
  sector: "industry",
  company_industry: "industry",
  sector_industrial: "industry",
  // Profile URL
  profile_url: "profileUrl",
  "profile url": "profileUrl",
  perfil_url: "profileUrl",
  url_perfil: "profileUrl",
  perfil: "profileUrl",
  // LinkedIn
  linkedin: "linkedinUrl",
  "linkedin url": "linkedinUrl",
  linkedin_url: "linkedinUrl",
  "url linkedin": "linkedinUrl",
  "perfil linkedin": "linkedinUrl",
  linkedin_profile: "linkedinUrl",
  company_linkedin: "linkedinUrl",
  "linkedin profile": "linkedinUrl",
  // Google Maps
  "google maps": "googleMapsUrl",
  "maps url": "googleMapsUrl",
  "url maps": "googleMapsUrl",
  "google maps url": "googleMapsUrl",
  google_maps_url: "googleMapsUrl",
  maps_link: "googleMapsUrl",
  google_maps_link: "googleMapsUrl",
  company_google_maps: "googleMapsUrl",
};

// Fuzzy partial matching rules (checked if exact map fails)
const FUZZY_RULES: Array<{ pattern: RegExp; field: LeadField }> = [
  { pattern: /e[-_]?mail/i, field: "email" },
  { pattern: /phone|telefono|teléfono|celular|mobile/i, field: "phone" },
  { pattern: /linkedin/i, field: "linkedinUrl" },
  { pattern: /google.?map/i, field: "googleMapsUrl" },
  { pattern: /street|address|direcci[oó]n/i, field: "address" },
  { pattern: /\bcity\b|ciudad/i, field: "city" },
  { pattern: /\bstate\b|estado|provincia/i, field: "state" },
  { pattern: /country|pa[ií]s/i, field: "country" },
  { pattern: /industr|industria/i, field: "industry" },
  { pattern: /categor/i, field: "category" },
  { pattern: /website|sitio.?web|homepage/i, field: "website" },
  { pattern: /first.?name|nombre.?pila/i, field: "firstName" },
  { pattern: /last.?name|apellido|surname/i, field: "lastName" },
  { pattern: /\btitle\b|cargo|puesto|headline|position/i, field: "contactTitle" },
  { pattern: /company.?name|business.?name|empresa|negocio/i, field: "businessName" },
  { pattern: /profile.?url|perfil.?url/i, field: "profileUrl" },
];

function autoMapColumns(
  headers: string[]
): Array<LeadField | "skip"> {
  const used = new Set<LeadField>();
  return headers.map((header) => {
    const normalized = header.toLowerCase().trim().replace(/\s+/g, " ");
    // 1. Exact match
    const exact = COLUMN_MAP[normalized];
    if (exact && !used.has(exact)) { used.add(exact); return exact; }
    // Also try replacing spaces with underscores
    const underscored = normalized.replace(/ /g, "_");
    const exactU = COLUMN_MAP[underscored];
    if (exactU && !used.has(exactU)) { used.add(exactU); return exactU; }
    // 2. Fuzzy partial match
    for (const rule of FUZZY_RULES) {
      if (rule.pattern.test(normalized) && !used.has(rule.field)) {
        used.add(rule.field);
        return rule.field;
      }
    }
    return "skip";
  });
}

function parseRowsWithMapping(
  rows: string[][],
  mapping: Array<LeadField | "skip">
): ParsedLead[] {
  return rows
    .map((row) => {
      const lead: ParsedLead = {};
      mapping.forEach((field, idx) => {
        if (field === "skip") return;
        const value = row[idx]?.trim();
        if (value) lead[field] = value;
      });
      return lead;
    })
    .map((lead) => {
      // Auto-derive contactPerson from firstName+lastName
      if ((lead.firstName || lead.lastName) && !lead.contactPerson) {
        lead.contactPerson = [lead.firstName, lead.lastName].filter(Boolean).join(" ");
      }
      return lead;
    })
    .filter((lead) => Object.keys(lead).length > 0);
}

const CSV_TEMPLATE = `Negocio,Nombre,Apellido,Cargo,Email,Teléfono,Website,Dirección,Ciudad,Estado,País,Categoría,Industria,LinkedIn URL,Google Maps URL
Restaurante El Buen Sabor,Juan,Pérez,Gerente General,juan@buensabor.com,+57 300 111 2222,https://buensabor.com,Calle 10 #5-20,Bogotá,Cundinamarca,Colombia,Restaurante,Gastronomía,https://linkedin.com/in/juanperez,https://maps.google.com/?cid=123456
Dentista Sonrisa,María,López,Directora Clínica,info@sonrisa.co,+57 310 333 4444,https://sonrisa.co,Carrera 7 #45-10,Medellín,Antioquia,Colombia,Dentista,Salud,https://linkedin.com/in/marialopez,https://maps.google.com/?cid=789012`;

export function ImportLeadsModal({
  open,
  onOpenChange,
  onImported,
}: ImportLeadsModalProps) {
  const [step, setStep] = useState<"upload" | "mapping" | "preview">("upload");
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Array<LeadField | "skip">>([]);
  const [parsedLeads, setParsedLeads] = useState<ParsedLead[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [skippedCount, setSkippedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setStep("upload");
    setRawRows([]);
    setFileHeaders([]);
    setColumnMapping([]);
    setParsedLeads([]);
    setFileName("");
    setImporting(false);
    setDragging(false);
    setSkippedCount(0);
  }, []);

  const handleOpenChange = (open: boolean) => {
    if (!open) resetState();
    onOpenChange(open);
  };

  // ── File parsing → go to mapping step ──

  const processFile = useCallback((file: File) => {
    setFileName(file.name);
    const ext = file.name.split(".").pop()?.toLowerCase();

    const handleParsedRows = (rows: string[][]) => {
      if (rows.length < 2) {
        toast.error("El archivo está vacío o solo tiene encabezados");
        return;
      }
      const headers = rows[0].map((h) => (typeof h === "string" ? h : String(h)));
      const dataRows = rows.slice(1);
      const mapping = autoMapColumns(headers);

      setFileHeaders(headers);
      setRawRows(dataRows);
      setColumnMapping(mapping);
      setStep("mapping");
    };

    if (ext === "csv" || ext === "tsv" || ext === "txt") {
      Papa.parse(file, {
        complete: (results) => {
          handleParsedRows(results.data as string[][]);
        },
        error: () => {
          toast.error("Error al leer el archivo CSV");
        },
      });
    } else if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows: string[][] = XLSX.utils.sheet_to_json(firstSheet, {
            header: 1,
          });
          handleParsedRows(rows.map((r) => r.map(String)));
        } catch {
          toast.error("Error al leer el archivo Excel");
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      toast.error("Formato no soportado. Usa CSV o Excel (.xlsx, .xls)");
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  // ── Mapping → Preview ──

  const handleColumnChange = (idx: number, value: string) => {
    setColumnMapping((prev) => {
      const next = [...prev];
      next[idx] = value as LeadField | "skip";
      return next;
    });
  };

  const mappedFieldCount = columnMapping.filter((f) => f !== "skip").length;

  const handleContinueToPreview = () => {
    if (mappedFieldCount === 0) {
      toast.error("Debes mapear al menos una columna");
      return;
    }
    const leads = parseRowsWithMapping(rawRows, columnMapping);
    const totalDataRows = rawRows.filter((r) => r.some((cell) => cell?.trim())).length;
    setSkippedCount(totalDataRows - leads.length);
    setParsedLeads(leads);
    setStep("preview");
  };

  // ── Import ──

  const handleImport = async () => {
    if (parsedLeads.length === 0) return;

    setImporting(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leads: parsedLeads.map((l) => ({ ...l, source: "csv_import" })),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error al importar");
      }

      const result = await res.json();
      toast.success(result.message || `${result.created} leads importados`);
      handleOpenChange(false);
      onImported?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al importar");
    } finally {
      setImporting(false);
    }
  };

  // ── Download template ──

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla-leads.csv";
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
    toast.success("Plantilla descargada");
  };

  // ── Stats ──

  const withEmail = parsedLeads.filter((l) => l.email).length;
  const withPhone = parsedLeads.filter((l) => l.phone).length;
  const withWebsite = parsedLeads.filter((l) => l.website).length;

  // ── Sample values for mapping step ──
  const getSampleValues = (colIdx: number): string[] => {
    const samples: string[] = [];
    for (let i = 0; i < Math.min(rawRows.length, 3); i++) {
      const val = rawRows[i]?.[colIdx]?.trim();
      if (val) samples.push(val);
    }
    return samples;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">
            {step === "upload"
              ? "Importar Contactos"
              : step === "mapping"
                ? "Mapear Columnas"
                : "Preview de Importación"}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {step === "upload"
              ? "Sube un archivo CSV o Excel con tus contactos"
              : step === "mapping"
                ? `${fileHeaders.length} columnas encontradas en ${fileName} — asigna cada una a un campo o márcala para omitir`
                : `${parsedLeads.length} contactos listos para importar desde ${fileName}`}
          </DialogDescription>
        </DialogHeader>

        {/* ── Step 1: Upload ── */}
        {step === "upload" && (
          <div className="py-4 space-y-4">
            {/* Drop zone */}
            <div
              className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
                dragging
                  ? "border-emerald-400 bg-emerald-500/10"
                  : "border-zinc-700 hover:border-zinc-500"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,.tsv,.txt"
                className="hidden"
                onChange={handleFileSelect}
              />
              <FileSpreadsheet className="h-10 w-10 text-zinc-500 mx-auto mb-3" />
              <p className="text-zinc-300 font-medium">
                Arrastra tu archivo aquí o haz clic para seleccionar
              </p>
              <p className="text-zinc-500 text-sm mt-1">
                Soporta CSV, Excel (.xlsx, .xls)
              </p>
            </div>

            {/* Download template */}
            <Button
              variant="outline"
              size="sm"
              onClick={downloadTemplate}
              className="w-full border-zinc-700 text-zinc-400 border-dashed"
            >
              <Download className="mr-2 h-4 w-4" />
              Descargar plantilla CSV de ejemplo
            </Button>
          </div>
        )}

        {/* ── Step 2: Column Mapping ── */}
        {step === "mapping" && (
          <div className="py-2 space-y-3">
            {/* Summary badge */}
            <div className="flex items-center gap-3 text-sm">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <Columns3 className="h-4 w-4" />
                {mappedFieldCount} columnas mapeadas
              </span>
              {columnMapping.filter((f) => f === "skip").length > 0 && (
                <span className="flex items-center gap-1.5 text-zinc-500">
                  <EyeOff className="h-3.5 w-3.5" />
                  {columnMapping.filter((f) => f === "skip").length} omitidas
                </span>
              )}
            </div>

            {/* Column mapping list */}
            <div className="rounded-lg border border-zinc-800 overflow-hidden max-h-[380px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableHead className="text-zinc-400 text-xs w-[200px]">
                      Columna del archivo
                    </TableHead>
                    <TableHead className="text-zinc-400 text-xs w-[200px]">
                      Asignar a campo
                    </TableHead>
                    <TableHead className="text-zinc-400 text-xs">
                      Valores de ejemplo
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fileHeaders.map((header, idx) => {
                    const currentField = columnMapping[idx];
                    const isSkipped = currentField === "skip";
                    const samples = getSampleValues(idx);

                    return (
                      <TableRow
                        key={idx}
                        className={`border-zinc-800 ${isSkipped ? "opacity-50" : ""}`}
                      >
                        <TableCell className="py-2">
                          <span className="text-sm text-zinc-200 font-medium">
                            {header}
                          </span>
                        </TableCell>
                        <TableCell className="py-2">
                          <Select
                            value={currentField}
                            onValueChange={(v) => handleColumnChange(idx, v)}
                          >
                            <SelectTrigger
                              className={`h-8 text-xs ${
                                isSkipped
                                  ? "bg-zinc-800/50 border-zinc-700/50 text-zinc-500"
                                  : "bg-zinc-800 border-zinc-700 text-zinc-200"
                              }`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {FIELD_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  <span className="flex items-center gap-1.5">
                                    {opt.value === "skip" && (
                                      <EyeOff className="h-3 w-3 text-zinc-500" />
                                    )}
                                    {opt.label}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex flex-wrap gap-1.5">
                            {samples.length > 0 ? (
                              samples.map((val, si) => (
                                <span
                                  key={si}
                                  className="text-[11px] text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded max-w-[160px] truncate inline-block"
                                >
                                  {val}
                                </span>
                              ))
                            ) : (
                              <span className="text-[11px] text-zinc-600 italic">
                                sin datos
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* ── Step 3: Preview ── */}
        {step === "preview" && (
          <div className="py-2 space-y-4">
            {/* Stats */}
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                {parsedLeads.length} contactos
              </span>
              <span className="flex items-center gap-1.5 text-zinc-400">
                <Mail className="h-3.5 w-3.5" />
                {withEmail} con email
              </span>
              <span className="flex items-center gap-1.5 text-zinc-400">
                <Phone className="h-3.5 w-3.5" />
                {withPhone} con tel
              </span>
              <span className="flex items-center gap-1.5 text-zinc-400">
                <Globe className="h-3.5 w-3.5" />
                {withWebsite} con web
              </span>
              {skippedCount > 0 && (
                <span className="flex items-center gap-1.5 text-zinc-500">
                  <XCircle className="h-3.5 w-3.5" />
                  {skippedCount} filas vacías omitidas
                </span>
              )}
              {parsedLeads.length > 500 && (
                <span className="flex items-center gap-1.5 text-amber-400">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Solo se importarán los primeros 500
                </span>
              )}
            </div>

            {/* Preview table — only essential columns for quick validation */}
            <div className="rounded-lg border border-zinc-800 overflow-hidden max-h-[300px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableHead className="text-zinc-400 text-xs w-8">#</TableHead>
                    <TableHead className="text-zinc-400 text-xs">Negocio</TableHead>
                    <TableHead className="text-zinc-400 text-xs">Nombre</TableHead>
                    <TableHead className="text-zinc-400 text-xs">Apellido</TableHead>
                    <TableHead className="text-zinc-400 text-xs">Email</TableHead>
                    <TableHead className="text-zinc-400 text-xs">Teléfono</TableHead>
                    <TableHead className="text-zinc-400 text-xs">Ciudad</TableHead>
                    <TableHead className="text-zinc-400 text-xs">Categoría</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedLeads.slice(0, 10).map((lead, i) => (
                    <TableRow key={i} className="border-zinc-800">
                      <TableCell className="text-xs text-zinc-600">{i + 1}</TableCell>
                      <TableCell className="text-xs text-zinc-300 max-w-[160px] truncate">
                        {lead.businessName || <span className="text-zinc-700">—</span>}
                      </TableCell>
                      <TableCell className="text-xs text-zinc-400 max-w-[120px] truncate">
                        {lead.firstName || <span className="text-zinc-700">—</span>}
                      </TableCell>
                      <TableCell className="text-xs text-zinc-400 max-w-[120px] truncate">
                        {lead.lastName || <span className="text-zinc-700">—</span>}
                      </TableCell>
                      <TableCell className="text-xs text-zinc-400 max-w-[180px] truncate">
                        {lead.email || <span className="text-zinc-700">—</span>}
                      </TableCell>
                      <TableCell className="text-xs text-zinc-400 max-w-[130px] truncate">
                        {lead.phone || <span className="text-zinc-700">—</span>}
                      </TableCell>
                      <TableCell className="text-xs text-zinc-400 max-w-[120px] truncate">
                        {lead.city || <span className="text-zinc-700">—</span>}
                      </TableCell>
                      <TableCell className="text-xs text-zinc-400 max-w-[120px] truncate">
                        {lead.category || lead.industry || <span className="text-zinc-700">—</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                  {parsedLeads.length > 10 && (
                    <TableRow className="border-zinc-800">
                      <TableCell colSpan={8} className="text-center text-xs text-zinc-500 py-3">
                        ... y {parsedLeads.length - 10} contactos más
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <DialogFooter>
          {step === "mapping" && (
            <Button
              variant="outline"
              onClick={() => setStep("upload")}
              className="border-zinc-700 text-zinc-400 mr-auto"
            >
              Cambiar archivo
            </Button>
          )}
          {step === "preview" && (
            <Button
              variant="outline"
              onClick={() => setStep("mapping")}
              className="border-zinc-700 text-zinc-400 mr-auto"
            >
              Editar mapeo
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="border-zinc-700 text-zinc-400"
          >
            Cancelar
          </Button>
          {step === "mapping" && (
            <Button
              onClick={handleContinueToPreview}
              disabled={mappedFieldCount === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              Continuar ({mappedFieldCount} campos)
            </Button>
          )}
          {step === "preview" && (
            <Button
              onClick={handleImport}
              disabled={importing || parsedLeads.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {importing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Importar {Math.min(parsedLeads.length, 500)} contactos
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
