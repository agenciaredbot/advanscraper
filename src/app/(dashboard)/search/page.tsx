"use client";

import { useState, useEffect } from "react";
import { SourceSelector, type SearchSource } from "@/components/search/SourceSelector";
import { GoogleMapsForm } from "@/components/search/GoogleMapsForm";
import { LinkedInForm } from "@/components/search/LinkedInForm";
import { InstagramForm } from "@/components/search/InstagramForm";
import { ApifyForm } from "@/components/search/ApifyForm";
import { ProgressTracker } from "@/components/search/ProgressTracker";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function SearchPage() {
  const [source, setSource] = useState<SearchSource>("google_maps");
  const [isLoading, setIsLoading] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
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
        toast.error(result.error || "Error al iniciar búsqueda");
        setIsLoading(false);
        return;
      }

      setActiveJobId(result.jobId);
      toast.success("Búsqueda iniciada");
    } catch {
      toast.error("Error de conexión");
      setIsLoading(false);
    }
  };

  const handleJobComplete = () => {
    setIsLoading(false);
    setActiveJobId(null);
    toast.success("¡Búsqueda completada! Ve a Resultados para ver los leads.");
    router.refresh();
  };

  const handleJobCancel = () => {
    setIsLoading(false);
    setActiveJobId(null);
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

      {/* Active Job Progress */}
      {activeJobId && (
        <ProgressTracker
          jobId={activeJobId}
          onComplete={handleJobComplete}
          onCancel={handleJobCancel}
        />
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
