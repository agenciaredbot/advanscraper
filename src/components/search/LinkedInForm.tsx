"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Linkedin, Search, Loader2 } from "lucide-react";

interface LinkedInFormProps {
  onSubmit: (data: { keyword: string; location: string; maxResults: number }) => void;
  isLoading: boolean;
}

export function LinkedInForm({ onSubmit, isLoading }: LinkedInFormProps) {
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [maxResults, setMaxResults] = useState(20);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;
    onSubmit({ keyword, location, maxResults });
  };

  return (
    <Card className="border-zinc-800 bg-zinc-900/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-zinc-100">
          <Linkedin className="h-5 w-5 text-blue-400" />
          LinkedIn (via Google)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="li-keyword" className="text-zinc-300">
              Keyword / Título *
            </Label>
            <Input
              id="li-keyword"
              placeholder='Ej: "CEO", "Marketing Director", "CTO startup"'
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              required
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="li-location" className="text-zinc-300">
              Ubicación
            </Label>
            <Input
              id="li-location"
              placeholder='Ej: "Colombia", "Bogotá", "LATAM"'
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="li-max" className="text-zinc-300">
              Máximo de resultados
            </Label>
            <Input
              id="li-max"
              type="number"
              min={5}
              max={50}
              value={maxResults}
              onChange={(e) => setMaxResults(parseInt(e.target.value, 10) || 20)}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 w-24"
            />
            <p className="text-xs text-zinc-500">Máximo 50 perfiles/día (anti-ban)</p>
          </div>

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            disabled={isLoading || !keyword.trim()}
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
