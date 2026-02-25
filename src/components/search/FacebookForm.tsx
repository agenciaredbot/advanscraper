"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Facebook,
  Search,
  Loader2,
  Mail,
  Phone,
  Globe,
  MapPinned,
  Users,
  Star,
  Tag,
} from "lucide-react";

interface FacebookFormProps {
  onSubmit: (data: {
    query: string;
    pageUrl: string;
    location: string;
    maxResults: number;
  }) => void;
  isLoading: boolean;
}

export function FacebookForm({ onSubmit, isLoading }: FacebookFormProps) {
  const [query, setQuery] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [location, setLocation] = useState("");
  const [maxResults, setMaxResults] = useState(30);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() && !pageUrl.trim()) return;
    onSubmit({ query, pageUrl, location, maxResults });
  };

  return (
    <Card className="border-zinc-800 bg-zinc-900/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-zinc-100">
          <Facebook className="h-5 w-5 text-indigo-400" />
          Facebook Pages
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fb-query" className="text-zinc-300">
              Búsqueda por keyword
            </Label>
            <Input
              id="fb-query"
              placeholder='Ej: "dentistas Bogotá", "restaurantes mexicanos"'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-zinc-800" />
            <span className="text-xs text-zinc-500">O</span>
            <div className="h-px flex-1 bg-zinc-800" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fb-url" className="text-zinc-300">
              URL de página específica
            </Label>
            <Input
              id="fb-url"
              placeholder="Ej: https://www.facebook.com/tiendajuanvaldez"
              value={pageUrl}
              onChange={(e) => setPageUrl(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fb-location" className="text-zinc-300">
              Ubicación <span className="text-zinc-500">(opcional, solo keyword)</span>
            </Label>
            <Input
              id="fb-location"
              placeholder='Ej: "Bogotá, Colombia", "Mexico City, Mexico"'
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={!!pageUrl.trim()}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 disabled:opacity-40"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fb-max" className="text-zinc-300">
              Máximo de resultados
            </Label>
            <Input
              id="fb-max"
              type="number"
              min={5}
              max={200}
              value={maxResults}
              onChange={(e) =>
                setMaxResults(parseInt(e.target.value, 10) || 30)
              }
              className="bg-zinc-800 border-zinc-700 text-zinc-100 w-24"
            />
          </div>

          {/* Data info */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 space-y-2">
            <p className="text-xs font-medium text-zinc-400">Datos que obtendrás:</p>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2 py-0.5 text-[11px] text-indigo-400">
                <Mail className="h-3 w-3" /> Email
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2 py-0.5 text-[11px] text-indigo-400">
                <Phone className="h-3 w-3" /> Teléfono
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2 py-0.5 text-[11px] text-indigo-400">
                <Globe className="h-3 w-3" /> Website
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2 py-0.5 text-[11px] text-indigo-400">
                <MapPinned className="h-3 w-3" /> Dirección
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2 py-0.5 text-[11px] text-indigo-400">
                <Users className="h-3 w-3" /> Seguidores
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2 py-0.5 text-[11px] text-indigo-400">
                <Star className="h-3 w-3" /> Rating
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2 py-0.5 text-[11px] text-indigo-400">
                <Tag className="h-3 w-3" /> Categoría
              </span>
            </div>
            <p className="text-[10px] text-zinc-500">
              Datos extraídos de páginas públicas de Facebook. No requiere login.
            </p>
          </div>

          <Button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
            disabled={isLoading || (!query.trim() && !pageUrl.trim())}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Buscando...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Buscar Páginas
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
