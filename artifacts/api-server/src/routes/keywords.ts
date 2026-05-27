import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, businessesTable, keywordsTable, keywordLinksTable } from "@workspace/db";
import {
  AddKeywordBody,
  UpdateKeywordParams,
  UpdateKeywordBody,
  DeleteKeywordParams,
  AddKeywordLinkBody,
  AddKeywordLinkParams,
  DeleteKeywordLinkParams,
  AnalyzeKeywordLinkParams,
  ListKeywordLinksParams,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();


async function getBusinessForUser(userId: string) {
  const businesses = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.userId, userId))
    .orderBy(desc(businessesTable.isActive), desc(businessesTable.createdAt));
  return businesses[0] ?? null;
}

// ─── Keywords CRUD ─────────────────────────────────────────────────────────────

router.get("/businesses/me/keywords", requireAuth, async (req: any, res): Promise<void> => {
  const business = await getBusinessForUser(req.userId);
  if (!business) { res.status(404).json({ error: "Business not found" }); return; }

  const keywords = await db.select().from(keywordsTable).where(eq(keywordsTable.businessId, business.id));
  res.json(keywords);
});

router.post("/businesses/me/keywords", requireAuth, async (req: any, res): Promise<void> => {
  const parsed = AddKeywordBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const business = await getBusinessForUser(req.userId);
  if (!business) { res.status(404).json({ error: "Business not found" }); return; }

  const [kw] = await db.insert(keywordsTable).values({ ...parsed.data, businessId: business.id }).returning();
  res.status(201).json(kw);
});

// ─── Keyword Links (must come before /:id routes) ─────────────────────────────

router.delete("/businesses/me/keywords/links/:id", requireAuth, async (req: any, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteKeywordLinkParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const business = await getBusinessForUser(req.userId);
  if (!business) { res.status(404).json({ error: "Business not found" }); return; }

  await db.delete(keywordLinksTable).where(
    and(eq(keywordLinksTable.id, params.data.id), eq(keywordLinksTable.businessId, business.id))
  );

  res.sendStatus(204);
});

router.post("/businesses/me/keywords/links/:id/analyze", requireAuth, async (req: any, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = AnalyzeKeywordLinkParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const business = await getBusinessForUser(req.userId);
  if (!business) { res.status(404).json({ error: "Business not found" }); return; }

  const [existingLink] = await db.select().from(keywordLinksTable).where(
    and(eq(keywordLinksTable.id, params.data.id), eq(keywordLinksTable.businessId, business.id))
  );
  if (!existingLink) { res.status(404).json({ error: "Link not found" }); return; }

  const analysisResult = await runLinkAnalysis(existingLink.url, existingLink.linkType, existingLink.description);

  const [updated] = await db.update(keywordLinksTable).set({
    aiLifespanDays: analysisResult.lifespanDays,
    aiEfficiencyPercent: analysisResult.efficiencyPercent,
    aiAccuracyPercent: analysisResult.accuracyPercent,
    aiVisibilityPercent: analysisResult.visibilityPercent,
    aiCustomerInsight: analysisResult.customerInsight,
    aiAnalysis: analysisResult.analysis,
    analyzedAt: new Date(),
  }).where(eq(keywordLinksTable.id, params.data.id)).returning();

  res.json(updated);
});

// ─── Keyword Links by keyword ID ──────────────────────────────────────────────

router.get("/businesses/me/keywords/:id/links", requireAuth, async (req: any, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = ListKeywordLinksParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const business = await getBusinessForUser(req.userId);
  if (!business) { res.status(404).json({ error: "Business not found" }); return; }

  const kw = await db.select().from(keywordsTable).where(
    and(eq(keywordsTable.id, params.data.id), eq(keywordsTable.businessId, business.id))
  );
  if (!kw.length) { res.status(404).json({ error: "Keyword not found" }); return; }

  const links = await db.select().from(keywordLinksTable).where(
    and(eq(keywordLinksTable.keywordId, params.data.id), eq(keywordLinksTable.businessId, business.id))
  );

  res.json(links);
});

router.post("/businesses/me/keywords/:id/links", requireAuth, async (req: any, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = AddKeywordLinkParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const parsed = AddKeywordLinkBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const business = await getBusinessForUser(req.userId);
  if (!business) { res.status(404).json({ error: "Business not found" }); return; }

  const kw = await db.select().from(keywordsTable).where(
    and(eq(keywordsTable.id, params.data.id), eq(keywordsTable.businessId, business.id))
  );
  if (!kw.length) { res.status(404).json({ error: "Keyword not found" }); return; }

  const analysisResult = await runLinkAnalysis(parsed.data.url, parsed.data.linkType, parsed.data.description);

  const [link] = await db.insert(keywordLinksTable).values({
    keywordId: params.data.id,
    businessId: business.id,
    url: parsed.data.url,
    description: parsed.data.description ?? null,
    linkType: parsed.data.linkType,
    aiLifespanDays: analysisResult.lifespanDays,
    aiEfficiencyPercent: analysisResult.efficiencyPercent,
    aiAccuracyPercent: analysisResult.accuracyPercent,
    aiVisibilityPercent: analysisResult.visibilityPercent,
    aiCustomerInsight: analysisResult.customerInsight,
    aiAnalysis: analysisResult.analysis,
    analyzedAt: new Date(),
  }).returning();

  res.status(201).json(link);
});

// ─── Keyword CRUD (must come after specific routes like /links/:id) ────────────

router.patch("/businesses/me/keywords/:id", requireAuth, async (req: any, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateKeywordParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const parsed = UpdateKeywordBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const business = await getBusinessForUser(req.userId);
  if (!business) { res.status(404).json({ error: "Business not found" }); return; }

  const [updated] = await db
    .update(keywordsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(keywordsTable.id, params.data.id), eq(keywordsTable.businessId, business.id)))
    .returning();

  if (!updated) { res.status(404).json({ error: "Keyword not found" }); return; }
  res.json(updated);
});

router.delete("/businesses/me/keywords/:id", requireAuth, async (req: any, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteKeywordParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const business = await getBusinessForUser(req.userId);
  if (!business) { res.status(404).json({ error: "Business not found" }); return; }

  await db
    .delete(keywordsTable)
    .where(and(eq(keywordsTable.id, params.data.id), eq(keywordsTable.businessId, business.id)));

  res.sendStatus(204);
});

// ─── Helpers ───────────────────────────────────────────────────────────────────

async function runLinkAnalysis(_url: string, _linkType: string, _description?: string | null): Promise<{
  lifespanDays: number | null;
  efficiencyPercent: number | null;
  accuracyPercent: number | null;
  visibilityPercent: number | null;
  customerInsight: string | null;
  analysis: string | null;
}> {
  return {
    lifespanDays: null,
    efficiencyPercent: null,
    accuracyPercent: null,
    visibilityPercent: null,
    customerInsight: null,
    analysis: null,
  };
}

export default router;
