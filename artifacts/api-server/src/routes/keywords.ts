import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { db, businessesTable, keywordsTable } from "@workspace/db";
import {
  AddKeywordBody,
  UpdateKeywordParams,
  UpdateKeywordBody,
  DeleteKeywordParams,
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
  const [business] = await db.select().from(businessesTable).where(eq(businessesTable.userId, userId));
  return business ?? null;
}

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

router.post("/businesses/me/keywords/generate", requireAuth, async (req: any, res): Promise<void> => {
  const business = await getBusinessForUser(req.userId);
  if (!business) { res.status(404).json({ error: "Business not found" }); return; }

  const prompt = `You are an AEO (Answer Engine Optimization) expert. Generate exactly 7 high-value keywords for the following business.

Business Name: ${business.businessName}
Industry: ${business.industry ?? "General"}
Description: ${business.description ?? "No description provided"}

Return a JSON array of objects with the exact structure:
[
  {
    "keyword": "the keyword phrase",
    "reason": "brief explanation of why this keyword is valuable for AEO",
    "estimatedVolume": 1000,
    "efficiencyScore": 8.5
  }
]

Focus on:
- Question-based queries ("how to", "what is", "best way to")
- Local intent if applicable
- High-intent commercial queries
- Long-tail keywords with AEO potential

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

  const prompt = `You are an AEO expert. Suggest 5 additional keyword improvements for this business.

Business: ${business.businessName}
Industry: ${business.industry ?? "General"}
Existing keywords: ${existing || "none yet"}

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

export default router;
