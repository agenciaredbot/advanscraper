"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Instagram, Search, Loader2, AlertCircle } from "lucide-react";

interface InstagramFormProps {
  onSubmit: (data: { username: string; query: string }) => void;
  isLoading: boolean;
  serviceOnline: boolean;
}

export function InstagramForm({ onSubmit, isLoading, serviceOnline }: InstagramFormProps) {
  const [username, setUsername] = useState("");
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() && !query.trim()) return;
    onSubmit({ username, query });
  };

  return (
    <Card className="border-zinc-800 bg-zinc-900/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-zinc-100">
            <Instagram className="h-5 w-5 text-pink-400" />
            Instagram
          </CardTitle>
          <Badge className={serviceOnline
            ? "bg-emerald-500/20 text-emerald-400"
            : "bg-red-500/20 text-red-400"
          }>
            {serviceOnline ? "Microservicio activo" : "Microservicio offline"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {!serviceOnline && (
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 mb-4 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
            <div className="text-sm text-amber-300">
              <p className="font-medium">Microservicio no disponible</p>
              <p className="text-amber-400 mt-1">
                Inicia el microservicio Python en <code className="bg-amber-500/10 px-1 rounded">services/instagram-scraper/</code> o usa Apify como alternativa premium.
              </p>
            </div>
          </div>
        )}

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

          <Button
            type="submit"
            className="w-full bg-pink-600 hover:bg-pink-700 text-white"
            disabled={isLoading || (!username.trim() && !query.trim()) || !serviceOnline}
          >
            {isLoading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Scrapeando...</>
            ) : (
              <><Search className="mr-2 h-4 w-4" />Scrapear Instagram</>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
