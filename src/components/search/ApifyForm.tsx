"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Search, Loader2 } from "lucide-react";

interface ApifyFormProps {
  onSubmit: (data: {
    source: string;
    query: string;
    location: string;
    maxResults: number;
    usernames?: string[];
  }) => void;
  isLoading: boolean;
}

export function ApifyForm({ onSubmit, isLoading }: ApifyFormProps) {
  const [source, setSource] = useState("google_maps");
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [maxResults, setMaxResults] = useState(50);
  const [usernames, setUsernames] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() && !usernames.trim()) return;
    onSubmit({
      source,
      query: query || usernames,
      location,
      maxResults,
      usernames: usernames ? usernames.split(",").map((u) => u.trim()).filter(Boolean) : undefined,
    });
  };

  return (
    <Card className="border-zinc-800 bg-zinc-900/50 border-amber-500/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-zinc-100">
          <Sparkles className="h-5 w-5 text-amber-400" />
          Apify Premium
          <span className="text-[10px] font-medium text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded ml-1">
            CRÉDITOS
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-zinc-300">Fuente de scraping</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="google_maps">Google Maps</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {source === "instagram" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="ap-usernames" className="text-zinc-300">
                  Usernames (separados por coma)
                </Label>
                <Input
                  id="ap-usernames"
                  placeholder='Ej: "user1, user2, user3"'
                  value={usernames}
                  onChange={(e) => setUsernames(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                />
                <div className="flex items-center gap-3 my-2">
                  <div className="h-px flex-1 bg-zinc-800" />
                  <span className="text-xs text-zinc-500">O búsqueda</span>
                  <div className="h-px flex-1 bg-zinc-800" />
                </div>
              </div>
            </>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="ap-query" className="text-zinc-300">
              {source === "instagram" ? "Búsqueda por keyword" : "Query de búsqueda *"}
            </Label>
            <Input
              id="ap-query"
              placeholder={
                source === "google_maps"
                  ? 'Ej: "restaurantes", "agencias digitales"'
                  : source === "linkedin"
                  ? 'Ej: "CEO tech", "Marketing Director"'
                  : 'Ej: "café bogotá"'
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
            />
          </div>

          {source !== "instagram" && (
            <div className="space-y-2">
              <Label htmlFor="ap-location" className="text-zinc-300">
                Ubicación
              </Label>
              <Input
                id="ap-location"
                placeholder='Ej: "Bogotá, Colombia"'
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="ap-max" className="text-zinc-300">
              Máximo de resultados
            </Label>
            <Input
              id="ap-max"
              type="number"
              min={10}
              max={500}
              value={maxResults}
              onChange={(e) => setMaxResults(parseInt(e.target.value, 10) || 50)}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 w-24"
            />
            <p className="text-xs text-amber-400/60">Consume créditos de Apify</p>
          </div>

          <Button
            type="submit"
            className="w-full bg-amber-600 hover:bg-amber-700 text-white"
            disabled={isLoading || (!query.trim() && !usernames.trim())}
          >
            {isLoading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Scrapeando con Apify...</>
            ) : (
              <><Sparkles className="mr-2 h-4 w-4" />Scrapear con Apify</>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
