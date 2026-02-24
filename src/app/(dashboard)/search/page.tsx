"use client";

import { useState, useEffect } from "react";
import { SourceSelector, type SearchSource } from "@/components/search/SourceSelector";
import { GoogleMapsForm } from "@/components/search/GoogleMapsForm";
import { LinkedInForm } from "@/components/search/LinkedInForm";
import { InstagramForm } from "@/components/search/InstagramForm";
import { ApifyForm } from "@/components/search/ApifyForm";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function SearchPage() {
  const [source, setSource] = useState<SearchSource>("google_maps");
  const [isLoading, setIsLoading] = useState(false);
  const [igServiceOnline, setIgServiceOnline] = useState(false);
  const router = useRouter();

  // Check Instagram microservice status
  useEffect(() => {
    fetch("/api/scrape/instagram/status")
      .then((res) => res.json())
      .then((data) => setIgServiceOnline(data.online))
      .catch(() => setIgServiceOnline(false));
  }, []);

  const startJob = async (endpoint: string, body: Record<string, unknown>) => {
    setIsLoading(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error || "Error al ejecutar búsqueda");
        return;
      }

      // Success — show result count and redirect
      toast.success(result.message || `¡${result.count} leads encontrados!`);
      router.push("/results");
    } catch {
      toast.error("Error de conexión. Intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-zinc-100">Búsqueda</h1>
        <p className="mt-1 text-zinc-400">
          Selecciona una fuente y configura tu búsqueda de leads
        </p>
      </div>

      {/* Source Selector */}
      <SourceSelector selected={source} onChange={setSource} />

      {/* Loading indicator */}
      {isLoading && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
          <div>
            <p className="text-zinc-100 font-medium">Buscando leads...</p>
            <p className="text-sm text-zinc-400">
              Esto puede tomar hasta 60 segundos. No cierres esta pestaña.
            </p>
          </div>
        </div>
      )}

      {/* Source-specific forms */}
      {source === "google_maps" && (
        <GoogleMapsForm
          onSubmit={(data) => startJob("/api/scrape/google-maps", data)}
          isLoading={isLoading}
        />
      )}

      {source === "linkedin" && (
        <LinkedInForm
          onSubmit={(data) => startJob("/api/scrape/linkedin", data)}
          isLoading={isLoading}
        />
      )}

      {source === "instagram" && (
        <InstagramForm
          onSubmit={(data) => startJob("/api/scrape/instagram", data)}
          isLoading={isLoading}
          serviceOnline={igServiceOnline}
        />
      )}

      {source === "apify" && (
        <ApifyForm
          onSubmit={(data) => startJob("/api/scrape/apify", data)}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
