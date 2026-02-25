"use client";

import { useState } from "react";
import { SourceSelector, type SearchSource } from "@/components/search/SourceSelector";
import { GoogleMapsForm } from "@/components/search/GoogleMapsForm";
import { LinkedInForm } from "@/components/search/LinkedInForm";
import { InstagramForm } from "@/components/search/InstagramForm";
import { FacebookForm } from "@/components/search/FacebookForm";
import { ProgressTracker } from "@/components/search/ProgressTracker";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function SearchPage() {
  const [source, setSource] = useState<SearchSource>("google_maps");
  const [isLoading, setIsLoading] = useState(false);
  const [activeSearchId, setActiveSearchId] = useState<string | null>(null);
  const router = useRouter();

  const startAsyncJob = async (body: Record<string, unknown>) => {
    setIsLoading(true);
    setActiveSearchId(null);

    try {
      const res = await fetch("/api/scrape/start", {
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

      // Show progress tracker — the search is now running in Apify cloud
      setActiveSearchId(result.searchId);
    } catch {
      toast.error("Error de conexión. Intenta de nuevo.");
      setIsLoading(false);
    }
  };

  const handleComplete = (count: number) => {
    setIsLoading(false);
    toast.success(`¡${count} leads encontrados!`);
    // Redirect to results after a short delay for the user to see the success state
    setTimeout(() => {
      router.push("/results");
    }, 1500);
  };

  const handleError = (error: string) => {
    setIsLoading(false);
    toast.error(error);
    setActiveSearchId(null);
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

      {/* Progress Tracker — shown while async search is running */}
      {activeSearchId && (
        <ProgressTracker
          searchId={activeSearchId}
          onComplete={handleComplete}
          onError={handleError}
        />
      )}

      {/* Source-specific forms */}
      {source === "google_maps" && (
        <GoogleMapsForm
          onSubmit={(data) =>
            startAsyncJob({
              source: "google_maps",
              query: data.query,
              location: data.location,
              maxResults: data.maxResults,
            })
          }
          isLoading={isLoading}
        />
      )}

      {source === "linkedin" && (
        <LinkedInForm
          onSubmit={(data) =>
            startAsyncJob({
              source: "linkedin",
              query: data.keyword,
              location: data.location,
              maxResults: data.maxResults,
            })
          }
          isLoading={isLoading}
        />
      )}

      {source === "instagram" && (
        <InstagramForm
          onSubmit={(data) =>
            startAsyncJob({
              source: "instagram",
              query: data.query || data.username,
              usernames: data.username ? [data.username] : undefined,
              maxResults: data.maxResults,
            })
          }
          isLoading={isLoading}
        />
      )}

      {source === "facebook" && (
        <FacebookForm
          onSubmit={(data) =>
            startAsyncJob({
              source: "facebook",
              query: data.query || data.pageUrl,
              pageUrls: data.pageUrl ? [data.pageUrl] : undefined,
              location: data.location || undefined,
              maxResults: data.maxResults,
            })
          }
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
