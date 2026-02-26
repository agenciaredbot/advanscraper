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
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  category?: string;
}

// Column name mapping (Spanish + English variants → field name)
const COLUMN_MAP: Record<string, keyof ParsedLead> = {
  // Business name
  negocio: "businessName",
  empresa: "businessName",
  "nombre del negocio": "businessName",
  "nombre empresa": "businessName",
  business: "businessName",
  "business name": "businessName",
  company: "businessName",
  nombre: "businessName",
  // Contact person
  contacto: "contactPerson",
  "persona de contacto": "contactPerson",
  "contact person": "contactPerson",
  contact: "contactPerson",
  persona: "contactPerson",
  // Email
  email: "email",
  correo: "email",
  "correo electrónico": "email",
  "correo electronico": "email",
  "e-mail": "email",
  mail: "email",
  // Phone
  teléfono: "phone",
  telefono: "phone",
  tel: "phone",
  phone: "phone",
  celular: "phone",
  móvil: "phone",
  movil: "phone",
  // Website
  website: "website",
  web: "website",
  "sitio web": "website",
  url: "website",
  página: "website",
  pagina: "website",
  // Address
  dirección: "address",
  direccion: "address",
  address: "address",
  // City
  ciudad: "city",
  city: "city",
  // Category
  categoría: "category",
  categoria: "category",
  category: "category",
  rubro: "category",
  sector: "category",
};

function mapColumns(headers: string[]): Record<number, keyof ParsedLead> {
  const mapping: Record<number, keyof ParsedLead> = {};
  headers.forEach((header, idx) => {
    const normalized = header.toLowerCase().trim();
    if (COLUMN_MAP[normalized]) {
      mapping[idx] = COLUMN_MAP[normalized];
    }
  });
  return mapping;
}

function parseRows(
  rows: string[][],
  columnMapping: Record<number, keyof ParsedLead>
): ParsedLead[] {
  return rows
    .map((row) => {
      const lead: ParsedLead = {};
      Object.entries(columnMapping).forEach(([idxStr, field]) => {
        const value = row[parseInt(idxStr)]?.trim();
        if (value) lead[field] = value;
      });
      return lead;
    })
    .filter((lead) => Object.keys(lead).length > 0);
}

const CSV_TEMPLATE = `Negocio,Contacto,Email,Teléfono,Website,Dirección,Ciudad,Categoría
Restaurante El Buen Sabor,Juan Pérez,juan@buensabor.com,+57 300 111 2222,https://buensabor.com,Calle 10 #5-20,Bogotá,Restaurante
Dentista Sonrisa,María López,info@sonrisa.co,+57 310 333 4444,https://sonrisa.co,Carrera 7 #45-10,Medellín,Dentista`;

export function ImportLeadsModal({
  open,
  onOpenChange,
  onImported,
}: ImportLeadsModalProps) {
  const [step, setStep] = useState<"upload" | "preview">("upload");
  const [parsedLeads, setParsedLeads] = useState<ParsedLead[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [skippedCount, setSkippedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setStep("upload");
    setParsedLeads([]);
    setHeaders([]);
    setFileName("");
    setImporting(false);
    setDragging(false);
    setSkippedCount(0);
  }, []);

  const handleOpenChange = (open: boolean) => {
    if (!open) resetState();
    onOpenChange(open);
  };

  // ── File parsing ──

  const processFile = useCallback((file: File) => {
    setFileName(file.name);
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "csv" || ext === "tsv" || ext === "txt") {
      Papa.parse(file, {
        complete: (results) => {
          const rows = results.data as string[][];
          if (rows.length < 2) {
            toast.error("El archivo está vacío o solo tiene encabezados");
            return;
          }
          const fileHeaders = rows[0];
          const columnMapping = mapColumns(fileHeaders);
          if (Object.keys(columnMapping).length === 0) {
            toast.error(
              "No se reconocieron las columnas. Usa nombres como: Negocio, Email, Teléfono, Website, Ciudad"
            );
            return;
          }
          const dataRows = rows.slice(1);
          const leads = parseRows(dataRows, columnMapping);
          const totalDataRows = dataRows.filter((r) => r.some((cell) => cell?.trim())).length;
          setSkippedCount(totalDataRows - leads.length);
          setHeaders(fileHeaders);
          setParsedLeads(leads);
          setStep("preview");
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
          if (rows.length < 2) {
            toast.error("El archivo está vacío o solo tiene encabezados");
            return;
          }
          const fileHeaders = rows[0].map(String);
          const columnMapping = mapColumns(fileHeaders);
          if (Object.keys(columnMapping).length === 0) {
            toast.error(
              "No se reconocieron las columnas. Usa nombres como: Negocio, Email, Teléfono, Website, Ciudad"
            );
            return;
          }
          const dataRows = rows.slice(1).map((r) => r.map(String));
          const leads = parseRows(dataRows, columnMapping);
          const totalDataRows = dataRows.filter((r) => r.some((cell) => cell?.trim())).length;
          setSkippedCount(totalDataRows - leads.length);
          setHeaders(fileHeaders);
          setParsedLeads(leads);
          setStep("preview");
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">
            {step === "upload" ? "Importar Contactos" : "Preview de Importación"}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {step === "upload"
              ? "Sube un archivo CSV o Excel con tus contactos"
              : `${parsedLeads.length} contactos encontrados en ${fileName}`}
          </DialogDescription>
        </DialogHeader>

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

            {/* Preview table */}
            <div className="rounded-lg border border-zinc-800 overflow-hidden max-h-[300px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableHead className="text-zinc-400 text-xs w-8">#</TableHead>
                    <TableHead className="text-zinc-400 text-xs">Negocio</TableHead>
                    <TableHead className="text-zinc-400 text-xs">Contacto</TableHead>
                    <TableHead className="text-zinc-400 text-xs">Email</TableHead>
                    <TableHead className="text-zinc-400 text-xs">Teléfono</TableHead>
                    <TableHead className="text-zinc-400 text-xs">Website</TableHead>
                    <TableHead className="text-zinc-400 text-xs">Ciudad</TableHead>
                    <TableHead className="text-zinc-400 text-xs">Categoría</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedLeads.slice(0, 10).map((lead, i) => (
                    <TableRow key={i} className="border-zinc-800">
                      <TableCell className="text-xs text-zinc-600">{i + 1}</TableCell>
                      <TableCell className="text-xs text-zinc-300 max-w-[140px] truncate">
                        {lead.businessName || <span className="text-zinc-700">—</span>}
                      </TableCell>
                      <TableCell className="text-xs text-zinc-400 max-w-[120px] truncate">
                        {lead.contactPerson || <span className="text-zinc-700">—</span>}
                      </TableCell>
                      <TableCell className="text-xs text-zinc-400 max-w-[160px] truncate">
                        {lead.email || <span className="text-zinc-700">—</span>}
                      </TableCell>
                      <TableCell className="text-xs text-zinc-400 max-w-[120px] truncate">
                        {lead.phone || <span className="text-zinc-700">—</span>}
                      </TableCell>
                      <TableCell className="text-xs text-zinc-400 max-w-[120px] truncate">
                        {lead.website ? (
                          lead.website.replace(/^https?:\/\//, "").replace(/\/$/, "")
                        ) : (
                          <span className="text-zinc-700">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-zinc-400">
                        {lead.city || <span className="text-zinc-700">—</span>}
                      </TableCell>
                      <TableCell className="text-xs text-zinc-400 max-w-[100px] truncate">
                        {lead.category || <span className="text-zinc-700">—</span>}
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

        <DialogFooter>
          {step === "preview" && (
            <Button
              variant="outline"
              onClick={() => setStep("upload")}
              className="border-zinc-700 text-zinc-400 mr-auto"
            >
              Cambiar archivo
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="border-zinc-700 text-zinc-400"
          >
            Cancelar
          </Button>
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
