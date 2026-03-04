/**
 * Shared types for the Services Layer.
 * All services receive a `userId` (already authenticated) and return typed data.
 */

// ─── Pagination ──────────────────────────────────────────────────────────────

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMeta;
}

// ─── Leads ───────────────────────────────────────────────────────────────────

export interface LeadInput {
  businessName?: string;
  contactPerson?: string;
  firstName?: string;
  lastName?: string;
  contactTitle?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  country?: string;
  category?: string;
  source?: string;
  state?: string;
  industry?: string;
  profileUrl?: string;
  linkedinUrl?: string;
  googleMapsUrl?: string;
}

export interface LeadFilters {
  source?: string;
  city?: string;
  hasEmail?: boolean;
  hasPhone?: boolean;
  searchId?: string;
  search?: string;
  isSaved?: boolean;
  tagId?: string;
}

export interface LeadUpdateData {
  businessName?: string | null;
  contactPerson?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  contactTitle?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  category?: string | null;
  bio?: string | null;
  profileUrl?: string | null;
  state?: string | null;
  industry?: string | null;
  linkedinUrl?: string | null;
  googleMapsUrl?: string | null;
}

export interface BulkCreateResult {
  created: number;
  skipped: number;
  total: number;
  message: string;
}

// ─── Scraping ────────────────────────────────────────────────────────────────

export interface StartScrapeParams {
  source: string;
  query: string;
  location?: string;
  maxResults?: number;
  usernames?: string[];
  pageUrls?: string[];
}

export interface ScrapeStatusResult {
  status: "running" | "completed" | "failed";
  phase?: string;
  count?: number;
  enrichedEmails?: number;
  progress?: {
    itemCount: number;
    durationSecs: number;
  };
  message?: string;
  error?: string;
}

// ─── AI ──────────────────────────────────────────────────────────────────────

export interface GenerateMessageParams {
  channel: string;
  lead: Record<string, unknown>;
  templateBase?: string;
  instructions?: string;
  includeVideo?: boolean;
  videoLink?: string;
  videoTitle?: string;
}

export interface GenerateBulkParams {
  channel: string;
  leads: Record<string, unknown>[];
  templateBase?: string;
  instructions?: string;
  includeVideo?: boolean;
  videoLink?: string;
  videoTitle?: string;
}

// ─── Campaigns ───────────────────────────────────────────────────────────────

export interface CreateCampaignParams {
  name: string;
  channel: string;
  templateId?: string;
  leadIds?: string[];
  listId?: string;
  useAI?: boolean;
  aiInstructions?: string;
  includeVideo?: boolean;
  videoType?: string;
  videoId?: string;
}

export interface SendCampaignResult {
  success: boolean;
  message: string;
}

// ─── Templates ───────────────────────────────────────────────────────────────

export interface CreateTemplateParams {
  name: string;
  channel: string;
  subject?: string;
  bodyShort?: string;
  bodyLong: string;
  useAI?: boolean;
  aiInstructions?: string;
}

export interface UpdateTemplateParams {
  name?: string;
  channel?: string;
  subject?: string;
  bodyShort?: string;
  bodyLong?: string;
  useAI?: boolean;
  aiInstructions?: string;
  includeVideo?: boolean;
  videoType?: string;
  videoId?: string;
}

// ─── Lists ───────────────────────────────────────────────────────────────────

export interface CreateListParams {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateListParams {
  name?: string;
  description?: string;
  color?: string;
}

// ─── Tags ────────────────────────────────────────────────────────────────────

export interface CreateTagParams {
  name: string;
  color?: string;
}

export interface UpdateTagParams {
  name?: string;
  color?: string;
}

export interface AssignTagsParams {
  leadId: string;
  tagIds?: string[];
  tagName?: string;
  color?: string;
}

// ─── Outreach ────────────────────────────────────────────────────────────────

export interface SendEmailParams {
  leadId: string;
  subject: string;
  message: string;
  senderName?: string;
  loomUrl?: string;
}

export interface LogOutreachParams {
  leadId: string;
  channel: string;
  action: string;
  messagePreview?: string;
  videoLink?: string;
}

export interface OutreachFilters {
  channel?: string;
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export interface ExportCSVParams {
  leadIds?: string[];
  searchId?: string;
  source?: string;
  search?: string;
  city?: string;
  hasEmail?: boolean;
  hasPhone?: boolean;
  isSaved?: boolean;
  tagId?: string;
}

// ─── Dashboard Stats ─────────────────────────────────────────────────────────

export interface DashboardStats {
  totalLeads: number;
  leadsToday: number;
  searchesToday: number;
  activeCampaigns: number;
  messagesSent: number;
  recentSearches: Array<{
    id: string;
    source: string;
    query: string;
    totalResults: number;
    status: string;
    createdAt: Date;
  }>;
  recentCampaigns: Array<{
    id: string;
    name: string;
    channel: string;
    status: string;
    sentCount: number;
    totalLeads: number;
    createdAt: Date;
  }>;
  leadsBySource: Array<{
    source: string;
    count: number;
  }>;
}
