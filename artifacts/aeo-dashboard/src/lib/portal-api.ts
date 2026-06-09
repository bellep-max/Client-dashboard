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
