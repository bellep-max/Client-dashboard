import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, businessesTable, keywordsTable, keywordLinksTable, reportsTable, gbpProfilesTable, websitesTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

async function getBusinessesForUser(userId: string) {
  return db.select().from(businessesTable).where(eq(businessesTable.userId, userId));
}

function toPortalBusiness(b: typeof businessesTable.$inferSelect, kwCount = 0) {
  return {
    id: b.id,
    clientId: 0,
    name: b.businessName,
    gmbUrl: null,
    websiteUrl: null,
    publishedAddress: null,
    zipCode: null,
    city: null,
    state: null,
    country: null,
    placeId: null,
    latitude: null,
    longitude: null,
    timezone: null,
    status: b.isActive ? "active" : "inactive",
    notes: null,
    createdAt: b.createdAt.toISOString(),
    keywordCount: kwCount,
    campaignCount: 0,
  };
}

function toPortalKeyword(
  kw: typeof keywordsTable.$inferSelect,
  businessName: string | null,
  links: typeof keywordLinksTable.$inferSelect[],
) {
  return {
    id: kw.id,
    clientId: 0,
    businessId: kw.businessId,
    aeoPlanId: null,
    keywordText: kw.keyword,
    keywordType: null,
    isActive: kw.status === "active",
    isPrimary: null,
    verificationStatus: null,
    status: kw.status,
    notes: kw.notes,
    implementedBy: null,
    dateAdded: kw.createdAt.toISOString(),
    createdAt: kw.createdAt.toISOString(),
    clientName: null,
    businessName,
    campaignName: null,
    lastRunAt: kw.updatedAt.toISOString(),
    initialRanking: kw.previousPosition ?? null,
    currentRanking: kw.currentPosition ?? null,
    isLocked: kw.currentPosition != null && kw.currentPosition <= 3,
    links: links.map((l) => ({
      id: l.id,
      keywordId: l.keywordId,
      url: l.url,
      description: l.description ?? null,
      linkType: l.linkType ?? null,
    })),
  };
}

function toPortalReport(
  r: typeof reportsTable.$inferSelect,
  keywords: typeof keywordsTable.$inferSelect[],
  title?: string,
) {
  const locked = keywords.filter((k) => k.currentPosition != null && k.currentPosition <= 3).length;
  const top3 = locked;
  const top10 = keywords.filter((k) => k.currentPosition != null && k.currentPosition <= 10).length;
  const noChange = r.keywordsTracked - r.keywordsImproved - r.keywordsDeclined;

  return {
    id: r.id,
    userId: "local",
    title: title ?? `Performance Report — ${r.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
    generatedAt: r.createdAt.toISOString(),
    summary: {
      totalKeywords: r.keywordsTracked,
      improved: r.keywordsImproved,
      declined: r.keywordsDeclined,
      noChange: Math.max(0, noChange),
      locked,
      top3,
      top10,
      snapshotDate: r.periodEnd.toISOString(),
      keywords: keywords.map((k) => ({
        id: k.id,
        keyword: k.keyword,
        initialRanking: k.previousPosition ?? null,
        currentRanking: k.currentPosition ?? null,
        isLocked: k.currentPosition != null && k.currentPosition <= 3,
        businessName: null,
        campaignName: null,
      })),
    },
  };
}

// ── GET /api/businesses ──────────────────────────────────────────────────────

router.get("/businesses", requireAuth, async (req: any, res): Promise<void> => {
  const businesses = await getBusinessesForUser(req.userId);
  const result = await Promise.all(
    businesses.map(async (b) => {
      const kws = await db.select({ id: keywordsTable.id }).from(keywordsTable).where(eq(keywordsTable.businessId, b.id));
      return toPortalBusiness(b, kws.length);
    }),
  );
  res.json(result);
});

// ── GET /api/businesses/:id ──────────────────────────────────────────────────

router.get("/businesses/:id", requireAuth, async (req: any, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [b] = await db.select().from(businessesTable).where(eq(businessesTable.id, id));
  if (!b || b.userId !== req.userId) { res.status(404).json({ error: "Not found" }); return; }
  const kws = await db.select({ id: keywordsTable.id }).from(keywordsTable).where(eq(keywordsTable.businessId, b.id));
  res.json(toPortalBusiness(b, kws.length));
});

// ── GET /api/keywords ────────────────────────────────────────────────────────

router.get("/keywords", requireAuth, async (req: any, res): Promise<void> => {
  const businesses = await getBusinessesForUser(req.userId);
  const bizIds = businesses.map((b) => b.id);
  if (bizIds.length === 0) { res.json([]); return; }

  const bizMap = new Map(businesses.map((b) => [b.id, b.businessName]));

  const allKeywords = await Promise.all(
    bizIds.map((bid) => db.select().from(keywordsTable).where(eq(keywordsTable.businessId, bid))),
  );
  const keywords = allKeywords.flat();

  const result = await Promise.all(
    keywords.map(async (kw) => {
      const links = await db.select().from(keywordLinksTable).where(eq(keywordLinksTable.keywordId, kw.id));
      return toPortalKeyword(kw, bizMap.get(kw.businessId) ?? null, links);
    }),
  );
  res.json(result);
});

// ── GET /api/keywords/:id ────────────────────────────────────────────────────

router.get("/keywords/:id", requireAuth, async (req: any, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [kw] = await db.select().from(keywordsTable).where(eq(keywordsTable.id, id));
  if (!kw) { res.status(404).json({ error: "Not found" }); return; }

  const [biz] = await db.select().from(businessesTable).where(eq(businessesTable.id, kw.businessId));
  if (!biz || biz.userId !== req.userId) { res.status(404).json({ error: "Not found" }); return; }

  const links = await db.select().from(keywordLinksTable).where(eq(keywordLinksTable.keywordId, kw.id));
  res.json(toPortalKeyword(kw, biz.businessName, links));
});

// ── GET /api/reports ─────────────────────────────────────────────────────────

router.get("/reports", requireAuth, async (req: any, res): Promise<void> => {
  const businesses = await getBusinessesForUser(req.userId);
  const bizIds = businesses.map((b) => b.id);
  if (bizIds.length === 0) { res.json([]); return; }

  const allReports = await Promise.all(
    bizIds.map((bid) =>
      db.select().from(reportsTable).where(eq(reportsTable.businessId, bid)).orderBy(desc(reportsTable.createdAt)),
    ),
  );
  const reports = allReports.flat().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const result = await Promise.all(
    reports.map(async (r) => {
      const kws = await db.select().from(keywordsTable).where(eq(keywordsTable.businessId, r.businessId));
      return toPortalReport(r, kws);
    }),
  );
  res.json(result);
});

// ── POST /api/reports ────────────────────────────────────────────────────────

router.post("/reports", requireAuth, async (req: any, res): Promise<void> => {
  const businesses = await getBusinessesForUser(req.userId);
  const business = businesses.find((b) => b.isActive) ?? businesses[0];
  if (!business) { res.status(404).json({ error: "No business found" }); return; }

  const keywords = await db.select().from(keywordsTable).where(eq(keywordsTable.businessId, business.id));
  const activeKws = keywords.filter((k) => k.status === "active");
  const improved = activeKws.filter((k) => k.currentPosition != null && k.previousPosition != null && k.currentPosition < k.previousPosition).length;
  const declined = activeKws.filter((k) => k.currentPosition != null && k.previousPosition != null && k.currentPosition > k.previousPosition).length;

  const now = new Date();
  const [report] = await db.insert(reportsTable).values({
    businessId: business.id,
    periodStart: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
    periodEnd: now,
    visibilityScore: null,
    totalImpressions: null,
    totalClicks: null,
    averagePosition: null,
    keywordsTracked: activeKws.length,
    keywordsImproved: improved,
    keywordsDeclined: declined,
    aiSummary: null,
    topKeywordsJson: "[]",
  }).returning();

  res.status(201).json(toPortalReport(report, keywords, req.body?.title));
});

// ── GET /api/reports/:id ─────────────────────────────────────────────────────

router.get("/reports/:id", requireAuth, async (req: any, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [report] = await db.select().from(reportsTable).where(eq(reportsTable.id, id));
  if (!report) { res.status(404).json({ error: "Not found" }); return; }

  const [biz] = await db.select().from(businessesTable).where(eq(businessesTable.id, report.businessId));
  if (!biz || biz.userId !== req.userId) { res.status(404).json({ error: "Not found" }); return; }

  const kws = await db.select().from(keywordsTable).where(eq(keywordsTable.businessId, report.businessId));
  res.json(toPortalReport(report, kws));
});

// ── GET /api/aeo-plans ───────────────────────────────────────────────────────
// Campaigns — no local table yet, return empty so the page renders cleanly

router.get("/aeo-plans", requireAuth, (_req, res) => { res.json([]); });

// ── GET /api/ranking-reports ─────────────────────────────────────────────────

router.get("/ranking-reports", requireAuth, (_req, res) => { res.json([]); });

export default router;
