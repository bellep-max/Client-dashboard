import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { db, businessesTable, keywordsTable, reportsTable, gbpProfilesTable, websitesTable } from "@workspace/db";
import { GetReportParams } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

function requireAuth(req: any, res: any, next: any) {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  req.userId = userId;
  next();
}

async function getBusinessForUser(userId: string) {
  const [business] = await db.select().from(businessesTable).where(eq(businessesTable.userId, userId));
  return business ?? null;
}

function parseTopKeywords(json: string) {
  try { return JSON.parse(json); } catch { return []; }
}

router.get("/businesses/me/reports", requireAuth, async (req: any, res): Promise<void> => {
  const business = await getBusinessForUser(req.userId);
  if (!business) { res.status(404).json({ error: "Business not found" }); return; }

  const reports = await db
    .select()
    .from(reportsTable)
    .where(eq(reportsTable.businessId, business.id))
    .orderBy(desc(reportsTable.createdAt));

  res.json(reports.map(r => ({ ...r, topKeywords: parseTopKeywords(r.topKeywordsJson) })));
});

router.post("/businesses/me/reports", requireAuth, async (req: any, res): Promise<void> => {
  const business = await getBusinessForUser(req.userId);
  if (!business) { res.status(404).json({ error: "Business not found" }); return; }

  const keywords = await db.select().from(keywordsTable).where(eq(keywordsTable.businessId, business.id));

  const now = new Date();
  const periodEnd = now;
  const periodStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const activeKws = keywords.filter(k => k.status === "active");
  const improved = activeKws.filter(k => k.currentPosition != null && k.previousPosition != null && k.currentPosition < k.previousPosition).length;
  const declined = activeKws.filter(k => k.currentPosition != null && k.previousPosition != null && k.currentPosition > k.previousPosition).length;

  const topKeywords = activeKws.slice(0, 5).map(k => ({
    keyword: k.keyword,
    position: k.currentPosition,
    change: k.previousPosition != null && k.currentPosition != null ? k.previousPosition - k.currentPosition : null,
    impressions: null,
  }));

  const avgEfficiency = activeKws.length > 0
    ? activeKws.reduce((sum, k) => sum + (k.efficiencyScore ?? 5), 0) / activeKws.length
    : null;

  let aiSummary: string | null = null;
  if (keywords.length > 0) {
    try {
      const summaryPrompt = `Generate a concise 2-3 sentence bi-weekly AEO performance summary for ${business.businessName}. 
Keywords tracked: ${activeKws.length}. Improved: ${improved}. Declined: ${declined}.
Top keywords: ${topKeywords.map(k => k.keyword).join(", ")}.
Highlight wins, areas to improve, and one actionable next step.`;

      const summaryRes = await openai.chat.completions.create({
        model: "gpt-5.4",
        max_completion_tokens: 300,
        messages: [{ role: "user", content: summaryPrompt }],
      });
      aiSummary = summaryRes.choices[0]?.message?.content ?? null;
    } catch {}
  }

  const [report] = await db.insert(reportsTable).values({
    businessId: business.id,
    periodStart,
    periodEnd,
    visibilityScore: avgEfficiency,
    totalImpressions: null,
    totalClicks: null,
    averagePosition: null,
    keywordsTracked: activeKws.length,
    keywordsImproved: improved,
    keywordsDeclined: declined,
    aiSummary,
    topKeywordsJson: JSON.stringify(topKeywords),
  }).returning();

  res.status(201).json({ ...report, topKeywords });
});

router.get("/businesses/me/reports/:id", requireAuth, async (req: any, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetReportParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const business = await getBusinessForUser(req.userId);
  if (!business) { res.status(404).json({ error: "Business not found" }); return; }

  const [report] = await db
    .select()
    .from(reportsTable)
    .where(eq(reportsTable.id, params.data.id));

  if (!report || report.businessId !== business.id) {
    res.status(404).json({ error: "Report not found" });
    return;
  }

  res.json({ ...report, topKeywords: parseTopKeywords(report.topKeywordsJson) });
});

router.get("/businesses/me/dashboard", requireAuth, async (req: any, res): Promise<void> => {
  const business = await getBusinessForUser(req.userId);
  if (!business) { res.status(404).json({ error: "Business not found" }); return; }

  const [keywords, gbpProfiles, websites, reports] = await Promise.all([
    db.select().from(keywordsTable).where(eq(keywordsTable.businessId, business.id)),
    db.select().from(gbpProfilesTable).where(eq(gbpProfilesTable.businessId, business.id)),
    db.select().from(websitesTable).where(eq(websitesTable.businessId, business.id)),
    db.select().from(reportsTable).where(eq(reportsTable.businessId, business.id)).orderBy(desc(reportsTable.createdAt)).limit(1),
  ]);

  const activeKws = keywords.filter(k => k.status === "active");
  const avgEfficiency = activeKws.length > 0
    ? activeKws.reduce((sum, k) => sum + (k.efficiencyScore ?? 5), 0) / activeKws.length
    : null;

  const lastReport = reports[0] ?? null;
  const gbpVerified = gbpProfiles.some(g => g.isVerified);

  const improved = activeKws.filter(k => k.currentPosition != null && k.previousPosition != null && k.currentPosition < k.previousPosition).length;
  const declined = activeKws.filter(k => k.currentPosition != null && k.previousPosition != null && k.currentPosition > k.previousPosition).length;
  let trend: "improving" | "declining" | "stable" | "unknown" = "unknown";
  if (activeKws.length > 0) {
    if (improved > declined) trend = "improving";
    else if (declined > improved) trend = "declining";
    else trend = "stable";
  }

  res.json({
    totalKeywords: keywords.length,
    activeKeywords: activeKws.length,
    averageEfficiencyScore: avgEfficiency,
    visibilityScore: lastReport?.visibilityScore ?? null,
    visibilityChange: null,
    totalWebsites: websites.length,
    gbpVerified,
    recentKeywordTrend: trend,
    lastReportDate: lastReport?.createdAt?.toISOString() ?? null,
    topKeywords: activeKws.slice(0, 5),
    onboardingComplete: business.onboardingComplete,
  });
});

export default router;
