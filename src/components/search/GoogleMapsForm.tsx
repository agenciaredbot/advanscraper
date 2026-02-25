"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Search, Loader2, Mail, Phone, Globe, Star, MapPinned, Tag } from "lucide-react";

interface GoogleMapsFormProps {
  onSubmit: (data: {
    query: string;
    location: string;
    maxResults: number;
    extractEmails: boolean;
  }) => void;
  isLoading: boolean;
}

export function GoogleMapsForm({ onSubmit, isLoading }: GoogleMapsFormProps) {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [maxResults, setMaxResults] = useState(20);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    onSubmit({ query, location, maxResults, extractEmails: true });
  };

  return (
    <Card className="border-zinc-800 bg-zinc-900/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-zinc-100">
          <MapPin className="h-5 w-5 text-emerald-400" />
          Google Maps
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gm-query" className="text-zinc-300">
              Búsqueda *
            </Label>
            <Input
              id="gm-query"
              placeholder='Ej: "cafeterías", "agencias de marketing", "dentistas"'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              required
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gm-location" className="text-zinc-300">
              Ubicación
            </Label>
            <Input
              id="gm-location"
              placeholder='Ej: "Bogotá", "Medellín, Colombia", "Ciudad de México"'
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gm-max" className="text-zinc-300">
              Máximo de resultados
            </Label>
            <Input
              id="gm-max"
              type="number"
              min={5}
              max={80}
              value={maxResults}
              onChange={(e) => setMaxResults(parseInt(e.target.value, 10) || 20)}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 w-24"
            />
          </div>

          {/* Data info */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 space-y-2">
            <p className="text-xs font-medium text-zinc-400">Datos que obtendrás:</p>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-400">
                <Mail className="h-3 w-3" /> Email
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-400">
                <Phone className="h-3 w-3" /> Teléfono
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-400">
                <Globe className="h-3 w-3" /> Website
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-400">
                <MapPinned className="h-3 w-3" /> Dirección
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-400">
                <Star className="h-3 w-3" /> Rating
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-400">
                <Tag className="h-3 w-3" /> Categoría
              </span>
            </div>
            <p className="text-[10px] text-zinc-500">
              Los emails se extraen automáticamente de los sitios web de cada negocio.
            </p>
          </div>

          <Button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={isLoading || !query.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scrapeando...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Iniciar Búsqueda
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
