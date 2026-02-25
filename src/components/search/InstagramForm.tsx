"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Instagram, Search, Loader2 } from "lucide-react";

interface InstagramFormProps {
  onSubmit: (data: { username: string; query: string; maxResults: number }) => void;
  isLoading: boolean;
}

export function InstagramForm({ onSubmit, isLoading }: InstagramFormProps) {
  const [username, setUsername] = useState("");
  const [query, setQuery] = useState("");
  const [maxResults, setMaxResults] = useState(20);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() && !query.trim()) return;
    onSubmit({ username, query, maxResults });
  };

  return (
    <Card className="border-zinc-800 bg-zinc-900/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-zinc-100">
          <Instagram className="h-5 w-5 text-pink-400" />
          Instagram
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ig-username" className="text-zinc-300">
              Username específico
            </Label>
            <Input
              id="ig-username"
              placeholder='Ej: "tiendajuanvaldez"'
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-zinc-800" />
            <span className="text-xs text-zinc-500">O</span>
            <div className="h-px flex-1 bg-zinc-800" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ig-query" className="text-zinc-300">
              Búsqueda por keyword
            </Label>
            <Input
              id="ig-query"
              placeholder='Ej: "café Bogotá", "marketing digital"'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ig-max" className="text-zinc-300">
              Máximo de resultados
            </Label>
            <Input
              id="ig-max"
              type="number"
              min={5}
              max={100}
              value={maxResults}
              onChange={(e) => setMaxResults(parseInt(e.target.value, 10) || 20)}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 w-24"
            />
            <p className="text-xs text-zinc-500">Incluye extracción de emails de bios y websites</p>
          </div>

          <Button
            type="submit"
            className="w-full bg-pink-600 hover:bg-pink-700 text-white"
            disabled={isLoading || (!username.trim() && !query.trim())}
          >
            {isLoading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Buscando...</>
            ) : (
              <><Search className="mr-2 h-4 w-4" />Buscar Perfiles</>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
