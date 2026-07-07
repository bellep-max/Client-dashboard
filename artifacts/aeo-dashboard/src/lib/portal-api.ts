/**
 * Thin fetch wrapper for portal endpoints not covered by the generated
 * @workspace/api-client-react. The Vite proxy rewrites /api/* → /api/portal/*
 * on localhost:3000 with httpOnly cookies attached automatically.
 *
 * For routes the orval client already covers (keywords, reports, dashboard,
 * etc.) prefer the generated hooks. Use this module only for:
 *   - /api/aeo-plans (CRUD)
 *   - /api/ranking-reports (list/detail)
 *   - /api/clients/me (admin-shape)
 */

const BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body != null && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  if (!headers.has("accept")) {
    headers.set("accept", "application/json");
  }
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    ...init,
    headers,
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body && typeof body === "object" && "error" in body) {
        detail = String((body as Record<string, unknown>).error ?? detail);
      }
    } catch {
      /* ignore — keep status-text detail */
    }
    throw new Error(detail);
  }
  if (res.status === 204) return null as T;
  return (await res.json()) as T;
}

// ---------------------------------------------------------------------------
// AEO Plans
// ---------------------------------------------------------------------------

export interface AeoPlan {
  id: number;
  clientId: number;
  businessId: number | null;
  name: string | null;
  businessName: string | null;
  planType: string;
  sampleQuestion1: string | null;
  sampleQuestion2: string | null;
  sampleQuestion3: string | null;
  sampleQuestion4: string | null;
  sampleQuestion5: string | null;
  sampleQuestion6: string | null;
  sampleQuestion7: string | null;
  sampleQuestion8: string | null;
  sampleQuestion9: string | null;
  sampleQuestion10: string | null;
  currentAnswerPresence: string | null;
  searchBoostTarget: number | null;
  monthlyAeoBudget: number | null;
  schemaImplementor: string | null;
  searchAddress: string | null;
  subscriptionId: string | null;
  subscriptionStartDate: string | null;
  nextBillingDate: string | null;
  cardLast4: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  keywordCount?: number;
  activeCount?: number;
  watchCount?: number;
  lockedCount?: number;
}

export type AeoPlanCreate = {
  name?: string | null;
  planType: string;
  monthlyAeoBudget?: number | string | null;
  businessId?: number | null;
  sampleQuestion1?: string | null;
  sampleQuestion2?: string | null;
  sampleQuestion3?: string | null;
  sampleQuestion4?: string | null;
  sampleQuestion5?: string | null;
  sampleQuestion6?: string | null;
  sampleQuestion7?: string | null;
  sampleQuestion8?: string | null;
  sampleQuestion9?: string | null;
  sampleQuestion10?: string | null;
  currentAnswerPresence?: string | null;
  searchBoostTarget?: number | null;
  schemaImplementor?: string | null;
  searchAddress?: string | null;
};

export type AeoPlanUpdate = Partial<AeoPlanCreate>;

export const listAeoPlans = (): Promise<AeoPlan[]> =>
  request<AeoPlan[]>("/api/aeo-plans");

export const getAeoPlan = (id: number): Promise<AeoPlan> =>
  request<AeoPlan>(`/api/aeo-plans/${id}`);

export const createAeoPlan = (body: AeoPlanCreate): Promise<AeoPlan> =>
  request<AeoPlan>("/api/aeo-plans", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const updateAeoPlan = (
  id: number,
  body: AeoPlanUpdate,
): Promise<AeoPlan> =>
  request<AeoPlan>(`/api/aeo-plans/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

export const deleteAeoPlan = (id: number): Promise<void> =>
  request<void>(`/api/aeo-plans/${id}`, { method: "DELETE" });

// ---------------------------------------------------------------------------
// Ranking reports (admin shape)
// ---------------------------------------------------------------------------

export interface RankingReport {
  id: number;
  clientId: number;
  businessId: number | null;
  keywordId: number | null;
  clientName: string | null;
  bizName: string | null;
  searchAddress: string | null;
  keyword: string | null;
  timestamp: string | null;
  date: string | null;
  platform: string | null;
  deviceIdentifier: string | null;
  status: string | null;
  durationSeconds: number | null;
  rankingPosition: number | null;
  rankingTotal: number | null;
  reasonRecommended: string | null;
  mapsPresence: boolean | null;
  mapsUrl: string | null;
  screenshotUrl: string | null;
  textRanking: string | null;
  isInitialRanking: boolean | null;
  proxyStatus: string | null;
  proxyIp: string | null;
  proxyCity: string | null;
  proxyRegion: string | null;
  proxyCountry: string | null;
  failureStep: string | null;
  error: string | null;
  createdAt: string;
  aeoPlanId: number | null;
}

export interface ListRankingReportsParams {
  businessId?: number;
  aeoPlanId?: number;
  keywordId?: number;
}

export const listRankingReports = (
  params: ListRankingReportsParams = {},
): Promise<RankingReport[]> => {
  const search = new URLSearchParams();
  if (params.businessId != null)
    search.set("businessId", String(params.businessId));
  if (params.aeoPlanId != null)
    search.set("aeoPlanId", String(params.aeoPlanId));
  if (params.keywordId != null)
    search.set("keywordId", String(params.keywordId));
  const qs = search.toString();
  return request<RankingReport[]>(`/api/ranking-reports${qs ? `?${qs}` : ""}`);
};

// ---------------------------------------------------------------------------
// Keywords (admin shape, includes aeoPlanId + lastRunAt)
// ---------------------------------------------------------------------------

export interface PortalKeyword {
  id: number;
  clientId: number;
  businessId: number | null;
  aeoPlanId: number | null;
  keywordText: string;
  keywordType: string | null;
  isActive: boolean;
  isPrimary: boolean | null;
  verificationStatus: string | null;
  status: string | null;
  notes: string | null;
  implementedBy: string | null;
  dateAdded: string | null;
  createdAt: string;
  clientName: string | null;
  businessName: string | null;
  campaignName: string | null;
  lastRunAt: string | null;
  initialRanking: number | null;
  currentRanking: number | null;
  isLocked: boolean;
  /** Derived date the keyword's win was locked in (only set for locked kws). */
  wonAt: string | null;
  links: Array<{
    id: number;
    keywordId: number;
    url: string;
    description: string | null;
    linkType: string | null;
  }>;
}

export const listKeywordsAdminShape = (
  params: { aeoPlanId?: number; businessId?: number } = {},
): Promise<PortalKeyword[]> => {
  const search = new URLSearchParams();
  if (params.aeoPlanId != null)
    search.set("aeoPlanId", String(params.aeoPlanId));
  if (params.businessId != null)
    search.set("businessId", String(params.businessId));
  const qs = search.toString();
  return request<PortalKeyword[]>(`/api/keywords${qs ? `?${qs}` : ""}`);
};

export const getKeywordAdminShape = (id: number): Promise<PortalKeyword> =>
  request<PortalKeyword>(`/api/keywords/${id}`);

// ---------------------------------------------------------------------------
// Businesses (admin shape — multi-business under one client)
// ---------------------------------------------------------------------------

export interface PortalBusiness {
  id: number;
  clientId: number;
  name: string;
  gmbUrl: string | null;
  websiteUrl: string | null;
  publishedAddress: string | null;
  zipCode: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  placeId: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  status: string | null;
  notes: string | null;
  createdAt: string;
  keywordCount?: number;
  campaignCount?: number;
}

export type PortalBusinessCreate = {
  name: string;
  gmbUrl?: string | null;
  websiteUrl?: string | null;
  publishedAddress?: string | null;
  zipCode?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  placeId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  timezone?: string | null;
  status?: string | null;
  notes?: string | null;
};

export type PortalBusinessUpdate = Partial<PortalBusinessCreate>;

export const listPortalBusinesses = (): Promise<PortalBusiness[]> =>
  request<PortalBusiness[]>("/api/businesses");

export const getPortalBusiness = (id: number): Promise<PortalBusiness> =>
  request<PortalBusiness>(`/api/businesses/${id}`);

export const createPortalBusiness = (
  body: PortalBusinessCreate,
): Promise<PortalBusiness> =>
  request<PortalBusiness>("/api/businesses", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const updatePortalBusiness = (
  id: number,
  body: PortalBusinessUpdate,
): Promise<PortalBusiness> =>
  request<PortalBusiness>(`/api/businesses/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

export const deletePortalBusiness = (id: number): Promise<void> =>
  request<void>(`/api/businesses/${id}`, { method: "DELETE" });

// ---------------------------------------------------------------------------
// Portal Reports (bi-weekly performance periods)
// ---------------------------------------------------------------------------

// Shape returned by GET /api/businesses/me/reports: one entry per ~14-day
// period with bucket-level aggregates (the backend does not return a
// per-keyword breakdown).
export interface PortalReport {
  id: number;
  businessId: number;
  periodStart: string;
  periodEnd: string;
  visibilityScore: number | null;
  averagePosition: number | null;
  keywordsTracked: number;
  keywordsImproved: number;
  keywordsDeclined: number;
  createdAt: string;
}

export const listPortalReports = (): Promise<PortalReport[]> =>
  request<PortalReport[]>("/api/businesses/me/reports");

/** A short, plain-English DeepSeek recap of one report period. `prev*` fields
 *  let the model mention progress versus the previous report. */
export interface ReportSummaryInput {
  periodStart: string;
  periodEnd: string;
  keywordsTracked: number;
  keywordsImproved: number;
  keywordsDeclined: number;
  averagePosition: number | null;
  visibilityScore: number | null;
  prevAveragePosition?: number | null;
  prevVisibilityScore?: number | null;
}

export const summarizeReport = (
  input: ReportSummaryInput,
): Promise<{ summary: string; cached: boolean }> =>
  request<{ summary: string; cached: boolean }>("/api/reports/summarize", {
    method: "POST",
    body: JSON.stringify(input),
  });

// ---------------------------------------------------------------------------
// Insights (read-only optimization transparency)
// Backed by /api/portal/insights/* and /api/portal/keywords/:id/variants.
// All responses are scoped to the authenticated customer's own client.
// ---------------------------------------------------------------------------

export type RankTrend = "improving" | "steady" | "declining";

export interface PlatformRank {
  position: number | null;
  date: string | null;
}

export interface LockedKeyword {
  id: number;
  keywordText: string;
  campaignName: string | null;
  businessName: string | null;
  aeoPlanId: number | null;
  businessId: number | null;
  replacementSuggestion: string | null;
  archiveReason: string | null;
  wonPlatform: string | null;
  wonPosition: number | null;
  wonAt: string | null;
  stabilityPercent: number;
  platforms: Record<string, PlatformRank>;
}

export interface RotationKeyword {
  id: number;
  keywordText: string;
  status: string | null;
  isActive: boolean;
  archivedAt: string | null;
  archiveReason: string | null;
  replacementSuggestion: string | null;
  aeoPlanId: number | null;
  businessId: number | null;
  campaignName: string | null;
  businessName: string | null;
  latestPosition: number | null;
  latestDate: string | null;
  platforms: Record<string, PlatformRank>;
  sparkline: number[];
  totalRuns: number;
  top3Runs: number;
  stabilityPercent: number;
  trend: RankTrend;
  atRisk: boolean;
  stallingSince: string | null;
  wonPlatform: string | null;
  wonPosition: number | null;
  wonAt: string | null;
}

export interface PlatformAggregate {
  tracked: number;
  top3: number;
  avgPosition: number | null;
}

export interface RotationTimelineEvent {
  type: "locked" | "archived";
  keywordId: number;
  keywordText: string;
  campaignName: string | null;
  platform?: string | null;
  position?: number | null;
  date: string;
  detail: string | null;
  replacement?: string | null;
}

export interface RotationStatus {
  summary: { total: number; locked: number; active: number; atRisk: number };
  platformAggregate: Record<string, PlatformAggregate>;
  keywords: RotationKeyword[];
  timeline: RotationTimelineEvent[];
}

export interface KeywordVariant {
  id: number;
  keywordId: number;
  variantText: string;
  isActive: boolean;
  weekOf: string | null;
  sourceModel: string | null;
  timesUsed: number;
  lastUsedAt: string | null;
  generatedAt: string | null;
  expiresAt: string | null;
}

type InsightFilters = { aeoPlanId?: number; businessId?: number };

function insightQuery(params: InsightFilters): string {
  const search = new URLSearchParams();
  if (params.aeoPlanId != null)
    search.set("aeoPlanId", String(params.aeoPlanId));
  if (params.businessId != null)
    search.set("businessId", String(params.businessId));
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const listLockedKeywords = (
  params: InsightFilters = {},
): Promise<LockedKeyword[]> =>
  request<LockedKeyword[]>(
    `/api/insights/locked-keywords${insightQuery(params)}`,
  );

export const getRotationStatus = (
  params: InsightFilters = {},
): Promise<RotationStatus> =>
  request<RotationStatus>(
    `/api/insights/rotation-status${insightQuery(params)}`,
  );

export const listKeywordVariants = (
  keywordId: number,
): Promise<{ variants: KeywordVariant[]; total: number }> =>
  request<{ variants: KeywordVariant[]; total: number }>(
    `/api/keywords/${keywordId}/variants`,
  );
