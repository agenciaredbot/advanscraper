"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Search, Loader2 } from "lucide-react";

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
  const [maxResults, setMaxResults] = useState(10);
  const [extractEmails, setExtractEmails] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    onSubmit({ query, location, maxResults, extractEmails });
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
            <p className="text-xs text-zinc-500">Máximo 80 por sesión</p>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="gm-emails"
              checked={extractEmails}
              onCheckedChange={(checked) =>
                setExtractEmails(checked as boolean)
              }
            />
            <Label htmlFor="gm-emails" className="text-zinc-300 text-sm cursor-pointer">
              Extraer emails de sitios web (agrega ~30s, más lento pero más datos)
            </Label>
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
