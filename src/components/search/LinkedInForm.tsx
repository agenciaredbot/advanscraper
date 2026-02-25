"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Linkedin, Search, Loader2, Mail, Briefcase, User, MapPin } from "lucide-react";

interface LinkedInFormProps {
  onSubmit: (data: { keyword: string; location: string; maxResults: number }) => void;
  isLoading: boolean;
}

export function LinkedInForm({ onSubmit, isLoading }: LinkedInFormProps) {
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [maxResults, setMaxResults] = useState(25);

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
          LinkedIn
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
              max={100}
              value={maxResults}
              onChange={(e) => setMaxResults(parseInt(e.target.value, 10) || 25)}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 w-24"
            />
          </div>

          {/* Data info */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 space-y-2">
            <p className="text-xs font-medium text-zinc-400">Datos que obtendrás:</p>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] text-blue-400">
                <User className="h-3 w-3" /> Nombre completo
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] text-blue-400">
                <Briefcase className="h-3 w-3" /> Empresa y cargo
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] text-blue-400">
                <Mail className="h-3 w-3" /> Email
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] text-blue-400">
                <MapPin className="h-3 w-3" /> Ubicación
              </span>
            </div>
            <p className="text-[10px] text-zinc-500">
              El email se busca automáticamente con verificación SMTP. No requiere cookies de LinkedIn.
            </p>
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
