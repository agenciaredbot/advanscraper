"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Copy, Check, AlertCircle } from "lucide-react";
import type { LeadContext, GeneratedMessage } from "@/lib/ai/types";

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

interface AIMessagePreviewProps {
  templateBase: string;
  channel: "email" | "whatsapp" | "linkedin" | "instagram";
  lead?: LeadContext | null;
  instructions?: string;
}

// -------------------------------------------------------------------
// Default lead for testing
// -------------------------------------------------------------------

const DEFAULT_LEAD: LeadContext = {
  businessName: "Restaurante El Buen Sabor",
  contactPerson: "Maria Garcia Lopez",
  contactTitle: "Propietaria",
  email: "maria@elbuensabor.com",
  website: "https://elbuensabor.com",
  city: "Ciudad de Mexico",
  category: "Restaurantes",
  rating: 4.5,
};

// -------------------------------------------------------------------
// Component
// -------------------------------------------------------------------

export function AIMessagePreview({
  templateBase,
  channel,
  lead,
  instructions,
}: AIMessagePreviewProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeneratedMessage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"subject" | "short" | "long" | null>(null);

  const activeLead = lead ?? DEFAULT_LEAD;

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          templateBase,
          lead: activeLead,
          instructions: instructions || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Error ${res.status}`);
      }

      const data: GeneratedMessage = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error generando mensaje");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, field: "subject" | "short" | "long") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(field);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(field);
      setTimeout(() => setCopied(null), 2000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Generate button */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleGenerate}
          disabled={loading || !templateBase.trim()}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {loading ? "Generando..." : "Generar con IA"}
        </Button>
        {!templateBase.trim() && (
          <p className="text-xs text-zinc-500">Escribe un mensaje base primero</p>
        )}
      </div>

      {/* Lead context info */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 px-4 py-3">
        <p className="text-xs font-medium text-zinc-500 mb-1">Lead de prueba:</p>
        <p className="text-xs text-zinc-400">
          {activeLead.contactPerson} - {activeLead.businessName} ({activeLead.city})
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/50 py-10">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400 mb-3" />
          <p className="text-sm text-zinc-400">Claude esta generando tu mensaje...</p>
          <p className="text-xs text-zinc-600 mt-1">Esto puede tomar unos segundos</p>
        </div>
      )}

      {/* Result */}
      {result && !loading && (
        <div className="space-y-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-medium text-emerald-400">Mensaje generado</span>
            {result.wordCount && (
              <Badge variant="outline" className="border-zinc-700 text-zinc-500 text-xs ml-auto">
                {result.wordCount} palabras
              </Badge>
            )}
          </div>

          {/* Subject (email) */}
          {channel === "email" && result.subject && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Asunto
                </p>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => copyToClipboard(result.subject!, "subject")}
                  className="text-zinc-500 hover:text-zinc-300"
                >
                  {copied === "subject" ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  Copiar
                </Button>
              </div>
              <div className="rounded-md border border-zinc-700 bg-zinc-800/50 px-3 py-2">
                <p className="text-sm text-zinc-200">{result.subject}</p>
              </div>
            </div>
          )}

          {/* Short message (linkedin) */}
          {channel === "linkedin" && result.messageShort && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Nota de conexion
                </p>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => copyToClipboard(result.messageShort!, "short")}
                  className="text-zinc-500 hover:text-zinc-300"
                >
                  {copied === "short" ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  Copiar
                </Button>
              </div>
              <div className="rounded-md border border-blue-500/20 bg-blue-500/5 px-3 py-2">
                <p className="text-sm text-zinc-200 whitespace-pre-wrap">{result.messageShort}</p>
                <p className="text-xs text-zinc-500 text-right mt-1">
                  {result.messageShort.length}/300
                </p>
              </div>
            </div>
          )}

          {/* Long message */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Mensaje {channel === "linkedin" ? "InMail" : "principal"}
              </p>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => copyToClipboard(result.messageLong, "long")}
                className="text-zinc-500 hover:text-zinc-300"
              >
                {copied === "long" ? (
                  <Check className="h-3 w-3 text-emerald-400" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                Copiar
              </Button>
            </div>
            <div className="rounded-md border border-zinc-700 bg-zinc-800/50 px-3 py-2">
              <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">
                {result.messageLong}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
