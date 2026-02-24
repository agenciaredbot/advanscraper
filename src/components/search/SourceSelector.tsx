"use client";

import { cn } from "@/lib/utils";
import { MapPin, Linkedin, Instagram, Sparkles } from "lucide-react";

export type SearchSource = "google_maps" | "linkedin" | "instagram" | "apify";

interface SourceSelectorProps {
  selected: SearchSource;
  onChange: (source: SearchSource) => void;
}

const sources = [
  {
    id: "google_maps" as const,
    label: "Google Maps",
    icon: MapPin,
    color: "text-emerald-400",
    borderColor: "border-emerald-500/30",
    bgColor: "bg-emerald-500/10",
  },
  {
    id: "linkedin" as const,
    label: "LinkedIn",
    icon: Linkedin,
    color: "text-blue-400",
    borderColor: "border-blue-500/30",
    bgColor: "bg-blue-500/10",
  },
  {
    id: "instagram" as const,
    label: "Instagram",
    icon: Instagram,
    color: "text-pink-400",
    borderColor: "border-pink-500/30",
    bgColor: "bg-pink-500/10",
  },
  {
    id: "apify" as const,
    label: "Apify",
    icon: Sparkles,
    color: "text-amber-400",
    borderColor: "border-amber-500/30",
    bgColor: "bg-amber-500/10",
    premium: true,
  },
];

export function SourceSelector({ selected, onChange }: SourceSelectorProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {sources.map((source) => {
        const isSelected = selected === source.id;
        return (
          <button
            key={source.id}
            onClick={() => onChange(source.id)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border p-4 transition-all",
              isSelected
                ? `${source.borderColor} ${source.bgColor}`
                : "border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900/50 hover:border-zinc-700"
            )}
          >
            <source.icon
              className={cn(
                "h-6 w-6",
                isSelected ? source.color : "text-zinc-500"
              )}
            />
            <span
              className={cn(
                "text-sm font-medium",
                isSelected ? source.color : "text-zinc-400"
              )}
            >
              {source.label}
            </span>
            {source.premium && (
              <span className="text-[10px] font-medium text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                PREMIUM
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
