"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Loader2 } from "lucide-react";

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
          <svg
            className="h-5 w-5 text-blue-500"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
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
              Ubicación <span className="text-zinc-500">(opcional)</span>
            </Label>
            <Input
              id="fb-location"
              placeholder='Ej: "Bogotá, Colombia", "Mexico City, Mexico"'
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
            />
            <p className="text-xs text-zinc-500">
              Formato: Ciudad, País. Solo aplica para búsqueda por keyword.
            </p>
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
            <p className="text-xs text-zinc-500">
              Incluye email, teléfono, website y dirección de páginas públicas
            </p>
          </div>

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
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
