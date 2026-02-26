"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  Linkedin,
  Instagram,
  Facebook,
  ExternalLink,
} from "lucide-react";

interface Lead {
  id: string;
  source: string;
  businessName: string | null;
  contactPerson: string | null;
  firstName: string | null;
  lastName: string | null;
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

interface ContactActionsProps {
  lead: Lead;
  onEmailClick?: () => void;
}

export function ContactActions({ lead, onEmailClick }: ContactActionsProps) {
  const profileUrl = lead.profileUrl || "";
  const isLinkedIn =
    profileUrl.includes("linkedin.com") || lead.source === "linkedin";
  const isInstagram =
    profileUrl.includes("instagram.com") || lead.source === "instagram";
  const isFacebook =
    profileUrl.includes("facebook.com") || lead.source === "facebook";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Email */}
      {lead.email ? (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={onEmailClick}
          >
            <Mail className="h-4 w-4 mr-1" />
            Enviar Email
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-zinc-400 hover:text-emerald-400 px-2"
            asChild
          >
            <a href={`mailto:${lead.email}`}>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
      ) : (
        <Badge
          variant="secondary"
          className="bg-zinc-800 text-zinc-500 cursor-default"
        >
          <Mail className="h-3 w-3 mr-1" />
          Email no disponible
        </Badge>
      )}

      {/* LinkedIn */}
      {isLinkedIn ? (
        <Button
          size="sm"
          className="bg-blue-500 hover:bg-blue-600 text-white"
          asChild
        >
          <a
            href={profileUrl.includes("linkedin.com") ? profileUrl : "#"}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Linkedin className="h-4 w-4 mr-1" />
            Abrir LinkedIn
          </a>
        </Button>
      ) : (
        <Badge
          variant="secondary"
          className="bg-zinc-800 text-zinc-500 cursor-default"
        >
          <Linkedin className="h-3 w-3 mr-1" />
          No disponible
        </Badge>
      )}

      {/* Instagram */}
      {isInstagram ? (
        <Button
          size="sm"
          className="bg-pink-500 hover:bg-pink-600 text-white"
          asChild
        >
          <a
            href={profileUrl.includes("instagram.com") ? profileUrl : "#"}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Instagram className="h-4 w-4 mr-1" />
            Abrir Instagram
          </a>
        </Button>
      ) : (
        <Badge
          variant="secondary"
          className="bg-zinc-800 text-zinc-500 cursor-default"
        >
          <Instagram className="h-3 w-3 mr-1" />
          No disponible
        </Badge>
      )}

      {/* Facebook — only show if applicable */}
      {isFacebook && (
        <Button
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white"
          asChild
        >
          <a
            href={profileUrl.includes("facebook.com") ? profileUrl : "#"}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Facebook className="h-4 w-4 mr-1" />
            Abrir Facebook
          </a>
        </Button>
      )}
    </div>
  );
}
