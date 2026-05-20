import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { getAuth } from "@clerk/express";
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
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

function requireAuth(req: any, res: any, next: any) {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.userId = userId;
  next();
}

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

// ─── AI Keyword Generation ─────────────────────────────────────────────────────

router.post("/businesses/me/keywords/generate", requireAuth, async (req: any, res): Promise<void> => {
  const business = await getBusinessForUser(req.userId);
  if (!business) { res.status(404).json({ error: "Business not found" }); return; }

  const prompt = `You are an AEO (Answer Engine Optimization) expert. Generate exactly 7 high-value keyword phrases for the following business to optimize for AI answer engines like ChatGPT, Gemini, and Perplexity.

Business Name: ${business.businessName}
Industry: ${business.industry ?? "General"}
Description: ${business.description ?? "No description provided"}

IMPORTANT RULES:
- Do NOT include any "near me" phrases
- Do NOT include location-based queries (e.g. "in [city]", "in [neighborhood]", "near [place]")
- Do NOT include local SEO phrases or geographic modifiers
- Focus exclusively on topic-based, intent-based, and industry expertise queries
- These queries must be appropriate for AI answer engine optimization (AEO), not local SEO

Focus on:
- Question-based queries ("how to", "what is", "best way to", "what are the benefits of")
- High-intent informational queries users ask AI assistants
- Industry knowledge and expertise queries
- Problem-solving and decision-making queries

Return a JSON array of objects with the exact structure:
[
  {
    "keyword": "the keyword phrase",
    "reason": "brief explanation of why this keyword is valuable for AEO",
    "estimatedVolume": 1000,
    "efficiencyScore": 8.5
  }
]

Return only valid JSON, no markdown.`;

  const response = await openai.chat.completions.create({
    model: "gpt-5.4",
    max_completion_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.choices[0]?.message?.content ?? "[]";
  try {
    const suggestions = JSON.parse(content);
    res.json(suggestions);
  } catch {
    res.json([]);
  }
});

router.get("/businesses/me/keywords/suggestions", requireAuth, async (req: any, res): Promise<void> => {
  const business = await getBusinessForUser(req.userId);
  if (!business) { res.status(404).json({ error: "Business not found" }); return; }

  const existingKws = await db.select().from(keywordsTable).where(eq(keywordsTable.businessId, business.id));
  const existing = existingKws.map(k => k.keyword).join(", ");

  const prompt = `You are an AEO expert. Suggest 5 additional keyword improvements for this business to rank better in AI answer engines like ChatGPT, Gemini, and Perplexity.

Business: ${business.businessName}
Industry: ${business.industry ?? "General"}
Existing keywords: ${existing || "none yet"}

IMPORTANT RULES:
- Do NOT suggest "near me" queries
- Do NOT suggest location-based or geographic queries
- Do NOT suggest local SEO phrases
- Focus on topic-based, intent-based, and authority-building queries
- Avoid duplicating existing keywords

Return a JSON array:
[
  {
    "keyword": "suggested keyword phrase",
    "reason": "why this keyword would improve AEO performance",
    "estimatedVolume": 500,
    "efficiencyScore": 7.2
  }
]

Return only valid JSON.`;

  const response = await openai.chat.completions.create({
    model: "gpt-5.4",
    max_completion_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.choices[0]?.message?.content ?? "[]";
  try {
    const suggestions = JSON.parse(content);
    res.json(suggestions);
  } catch {
    res.json([]);
  }
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
    aiAnalysis: analysisResult.analysis,
    analyzedAt: new Date(),
  }).returning();

  res.status(201).json(link);
});

// ─── Keyword CRUD (must come after specific routes like /generate, /links/:id) ─

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

async function runLinkAnalysis(url: string, linkType: string, description?: string | null): Promise<{ lifespanDays: number | null; efficiencyPercent: number | null; analysis: string }> {
  try {
    const prompt = `You are an AEO (Answer Engine Optimization) expert. Analyze this link for its long-term value in helping a business rank in AI answer engines (ChatGPT, Gemini, Perplexity).

URL: ${url}
Link Type: ${linkType}
Description: ${description || "No description provided"}

You must give TWO honest scores:

1. efficiencyPercent (0–100): How effective is this link for AEO overall?
   - 90–100: Authoritative, evergreen, highly relevant, trust-building domain
   - 70–89: Good quality, stable, relevant content
   - 50–69: Moderate quality or relevance
   - 30–49: Weak relevance, unstable, or thin content
   - 0–29: Unlikely to help AEO (spammy, irrelevant, very short-lived)
   Be truthful. Short links (e.g. goo.gl, bit.ly), low-quality blogs, or temporary pages should score low.

2. lifespanDays (integer): How many days will this link remain effective?
   - News article: 30–90 days
   - Blog post (evergreen): 365–730 days
   - Directory listing: 730–1825 days
   - Social profile: 365+ days
   - Short/redirect link: 30–60 days
   Be realistic.

Return ONLY valid JSON:
{
  "efficiencyPercent": 72,
  "lifespanDays": 365,
  "analysis": "One honest sentence explaining both scores and why."
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);
    return {
      lifespanDays: typeof parsed.lifespanDays === "number" ? parsed.lifespanDays : null,
      efficiencyPercent: typeof parsed.efficiencyPercent === "number" ? Math.min(100, Math.max(0, Math.round(parsed.efficiencyPercent))) : null,
      analysis: typeof parsed.analysis === "string" ? parsed.analysis : "Analysis not available.",
    };
  } catch {
    return { lifespanDays: null, efficiencyPercent: null, analysis: "Analysis could not be completed." };
  }
}

export default router;
