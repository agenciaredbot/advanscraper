export interface LeadContext {
  businessName?: string | null;
  contactPerson?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  contactTitle?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  city?: string | null;
  category?: string | null;
  rating?: number | null;
  followers?: number | null;
  bio?: string | null;
  profileUrl?: string | null;
}

export interface GenerateMessageRequest {
  channel: "email" | "whatsapp" | "linkedin" | "instagram";
  templateBase?: string;
  lead: LeadContext;
  instructions?: string;
  includeVideo?: boolean;
  videoLink?: string;
  videoTitle?: string;
}

export interface GeneratedMessage {
  channel: string;
  subject?: string;
  messageShort?: string; // For LinkedIn connection note (≤300 chars)
  messageLong: string;
  wordCount: number;
}

export interface GenerateBulkRequest {
  channel: "email" | "whatsapp" | "linkedin" | "instagram";
  templateBase?: string;
  leads: LeadContext[];
  instructions?: string;
  includeVideo?: boolean;
  videoLink?: string;
  videoTitle?: string;
}
