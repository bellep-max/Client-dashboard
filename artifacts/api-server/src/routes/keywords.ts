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

  const prompt = `You are an AEO (Answer Engine Optimization) expert. Generate exactly 7 high-value single-word keywords for the following business to optimize for AI answer engines like ChatGPT, Gemini, and Perplexity.

Business Name: ${business.businessName}
Industry: ${business.industry ?? "General"}
Description: ${business.description ?? "No description provided"}

CRITICAL RULES — you MUST follow these exactly:
- Every "keyword" field MUST be a SINGLE word only — no spaces, no hyphens, no phrases
- Do NOT output multi-word phrases (e.g. "daycare near me" is WRONG; "daycare" is correct)
- Do NOT include any "near me" phrases
- Do NOT include location-based or geographic modifiers
- Focus on core nouns, services, or industry terms that AI engines associate with this business
- Each keyword must be a standalone word that represents a concept, service, or topic

Good examples: "daycare", "toddler", "preschool", "enrollment", "childcare"
Bad examples: "best daycare", "near me", "childcare center", "how to find daycare"

Return a JSON array of objects with the exact structure:
[
  {
    "keyword": "singleword",
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
    const filtered = suggestions.filter((s: any) => typeof s.keyword === "string" && !s.keyword.trim().includes(" "));
    res.json(filtered);
  } catch {
    res.json([]);
  }
});

router.get("/businesses/me/keywords/suggestions", requireAuth, async (req: any, res): Promise<void> => {
  const business = await getBusinessForUser(req.userId);
  if (!business) { res.status(404).json({ error: "Business not found" }); return; }

  const existingKws = await db.select().from(keywordsTable).where(eq(keywordsTable.businessId, business.id));
  const existing = existingKws.map(k => k.keyword).join(", ");

  const prompt = `You are an AEO expert. Suggest 5 additional single-word keywords for this business to rank better in AI answer engines like ChatGPT, Gemini, and Perplexity.

Business: ${business.businessName}
Industry: ${business.industry ?? "General"}
Existing keywords: ${existing || "none yet"}

CRITICAL RULES — you MUST follow these exactly:
- Every "keyword" field MUST be a SINGLE word only — no spaces, no hyphens, no phrases
- Do NOT output multi-word phrases of any kind
- Do NOT suggest "near me" queries or location-based terms
- Focus on core nouns, services, or industry terms that complement the existing keywords
- Avoid duplicating existing keywords

Good examples: "daycare", "toddler", "preschool", "enrollment", "childcare"
Bad examples: "best daycare", "near me", "childcare center", "how to find daycare"

Return a JSON array:
[
  {
    "keyword": "singleword",
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
    const filtered = suggestions.filter((s: any) => typeof s.keyword === "string" && !s.keyword.trim().includes(" "));
    res.json(filtered);
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

async function runLinkAnalysis(url: string, linkType: string, description?: string | null): Promise<{
  lifespanDays: number | null;
  efficiencyPercent: number | null;
  accuracyPercent: number | null;
  visibilityPercent: number | null;
  customerInsight: string;
  analysis: string;
}> {
  try {
    const prompt = `You are an AEO (Answer Engine Optimization) expert. Analyze this link submitted by a business owner for its value in helping the business rank in AI answer engines (ChatGPT, Gemini, Perplexity, Claude, Grok).

URL: ${url}
Link Type: ${linkType}
Description: ${description || "No description provided"}

Give FOUR honest scores and TWO insights:

1. efficiencyPercent (0–100): Overall AEO effectiveness.
   - 90–100: Authoritative, evergreen, trust-building domain
   - 70–89: Good quality, stable, relevant
   - 50–69: Moderate quality or relevance
   - 30–49: Weak relevance, unstable, thin content
   - 0–29: Unlikely to help (spammy, redirect, irrelevant)
   Short links (goo.gl, bit.ly) and temporary pages score low.

2. accuracyPercent (0–100): How credible and factually reliable is this source?
   - 90–100: Major publication, official business page, verified directory
   - 70–89: Established blog, reputable industry source
   - 50–69: User-generated content, smaller blogs
   - 30–49: Unknown source, no clear editorial standards
   - 0–29: Potentially misleading, spam, or unverifiable

3. visibilityPercent (0–100): How likely is this link to be cited or referenced by AI answer engines?
   - 90–100: High-authority domain AI engines actively reference
   - 70–89: Known source, moderately referenced by AI
   - 50–69: Could appear in AI answers with supporting context
   - 30–49: Unlikely to be directly cited
   - 0–29: AI engines would ignore or distrust this

4. lifespanDays (integer): Estimated days this link remains effective.
   - News article: 30–90
   - Blog post (evergreen): 365–730
   - Directory listing: 730–1825
   - Social profile: 365+
   - Short/redirect link: 30–60

5. customerInsight (string): Based on the URL and link type, assess whether this appears to be customer-sourced content (e.g. a customer review, testimonial, forum mention, social media post about the business) vs. a business's own content. One clear sentence.

6. analysis (string): One concise sentence summarizing the overall AEO value and key reason for the scores.

Return ONLY valid JSON:
{
  "efficiencyPercent": 72,
  "accuracyPercent": 80,
  "visibilityPercent": 65,
  "lifespanDays": 365,
  "customerInsight": "This appears to be a third-party review or customer mention, which AI engines weight heavily as social proof.",
  "analysis": "Solid backlink from a stable domain with good authority, but content freshness may decline after 12 months."
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);
    const clamp = (v: unknown) => typeof v === "number" ? Math.min(100, Math.max(0, Math.round(v))) : null;
    return {
      lifespanDays: typeof parsed.lifespanDays === "number" ? parsed.lifespanDays : null,
      efficiencyPercent: clamp(parsed.efficiencyPercent),
      accuracyPercent: clamp(parsed.accuracyPercent),
      visibilityPercent: clamp(parsed.visibilityPercent),
      customerInsight: typeof parsed.customerInsight === "string" ? parsed.customerInsight : "Customer source assessment unavailable.",
      analysis: typeof parsed.analysis === "string" ? parsed.analysis : "Analysis not available.",
    };
  } catch {
    return { lifespanDays: null, efficiencyPercent: null, accuracyPercent: null, visibilityPercent: null, customerInsight: "Analysis could not be completed.", analysis: "Analysis could not be completed." };
  }
}

export default router;
