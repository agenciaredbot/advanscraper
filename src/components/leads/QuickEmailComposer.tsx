"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Send,
  Sparkles,
  ExternalLink,
  Mail,
} from "lucide-react";
import { toast } from "sonner";

interface Lead {
  id: string;
  source: string;
  businessName: string | null;
  contactPerson: string | null;
  contactTitle: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  category: string | null;
  rating: number | null;
  reviewsCount: number | null;
  followers: number | null;
  isBusiness: boolean | null;
  bio: string | null;
  profileUrl: string | null;
  isSaved: boolean;
  savedAt: string | null;
  scrapedAt: string;
  tags?: Array<{ tag: { id: string; name: string; color: string } }>;
  notes?: Array<{
    id: string;
    content: string;
    createdAt: string;
    updatedAt: string;
  }>;
  outreachLogs?: Array<{
    id: string;
    channel: string;
    action: string;
    messagePreview: string | null;
    status: string;
    sentAt: string;
  }>;
  listItems?: Array<{
    list: { id: string; name: string; color: string | null };
  }>;
}

interface QuickEmailComposerProps {
  lead: Lead;
  onSent?: () => void;
}

export function QuickEmailComposer({ lead, onSent }: QuickEmailComposerProps) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleGenerateAI = async () => {
    setGenerating(true);

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "email",
          lead: {
            businessName: lead.businessName,
            contactPerson: lead.contactPerson,
            contactTitle: lead.contactTitle,
            email: lead.email,
            phone: lead.phone,
            website: lead.website,
            city: lead.city,
            category: lead.category,
            rating: lead.rating,
            followers: lead.followers,
            bio: lead.bio,
            profileUrl: lead.profileUrl,
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al generar mensaje");
      }

      const data = await res.json();
      if (data.subject) setSubject(data.subject);
      if (data.messageLong) setMessage(data.messageLong);
      toast.success("Mensaje generado con IA");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al generar con IA"
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleSendBrevo = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error("Asunto y mensaje son requeridos");
      return;
    }

    setSending(true);

    try {
      const res = await fetch(`/api/leads/${lead.id}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          message: message.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al enviar email");
      }

      toast.success("Email enviado exitosamente");
      setSubject("");
      setMessage("");
      onSent?.();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al enviar email"
      );
    } finally {
      setSending(false);
    }
  };

  const mailtoUrl = `mailto:${encodeURIComponent(lead.email || "")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;

  const inputClassName =
    "bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500 focus:ring-emerald-500/20";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <Mail className="h-4 w-4" />
        <span>
          Para:{" "}
          <span className="text-zinc-200 font-medium">{lead.email}</span>
        </span>
      </div>

      {/* Subject */}
      <div className="space-y-1.5">
        <Label className="text-zinc-400 text-xs">Asunto</Label>
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Asunto del email..."
          className={inputClassName}
        />
      </div>

      {/* Message */}
      <div className="space-y-1.5">
        <Label className="text-zinc-400 text-xs">Mensaje</Label>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Escribe tu mensaje..."
          className={`${inputClassName} min-h-[120px] resize-none`}
          rows={4}
        />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2">
        {/* AI Generate */}
        <Button
          variant="outline"
          size="sm"
          className="border-violet-500/50 text-violet-400 hover:bg-violet-500/10 hover:text-violet-300"
          onClick={handleGenerateAI}
          disabled={generating || sending}
        >
          {generating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
          ) : (
            <Sparkles className="h-3.5 w-3.5 mr-1" />
          )}
          Generar con IA
        </Button>

        {/* Send via Brevo */}
        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={handleSendBrevo}
          disabled={sending || generating || !subject.trim() || !message.trim()}
        >
          {sending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
          ) : (
            <Send className="h-3.5 w-3.5 mr-1" />
          )}
          Enviar via Brevo
        </Button>

        {/* Open in email client */}
        <Button
          variant="ghost"
          size="sm"
          className="text-zinc-400 hover:text-zinc-200"
          asChild
        >
          <a href={mailtoUrl}>
            <ExternalLink className="h-3.5 w-3.5 mr-1" />
            Abrir en cliente de email
          </a>
        </Button>
      </div>
    </div>
  );
}
