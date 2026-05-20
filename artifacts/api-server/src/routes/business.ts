import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { db, businessesTable, gbpProfilesTable, websitesTable } from "@workspace/db";
import {
  CreateBusinessBody,
  UpdateBusinessBody,
  UpdateGbpProfileParams,
  UpdateGbpProfileBody,
  DeleteGbpProfileParams,
  AddGbpProfileBody,
  UpdateWebsiteParams,
  UpdateWebsiteBody,
  DeleteWebsiteParams,
  AddWebsiteBody,
  SwitchBusinessBody,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";

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

// ─── Business List ─────────────────────────────────────────────────────────────

router.get("/businesses", requireAuth, async (req: any, res): Promise<void> => {
  const businesses = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.userId, req.userId))
    .orderBy(desc(businessesTable.isActive), desc(businessesTable.createdAt));
  res.json(businesses);
});

router.post("/businesses/switch", requireAuth, async (req: any, res): Promise<void> => {
  const parsed = SwitchBusinessBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const businesses = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.userId, req.userId));

  const target = businesses.find(b => b.id === parsed.data.businessId);
  if (!target) {
    res.status(404).json({ error: "Business not found" });
    return;
  }

  await db
    .update(businessesTable)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(businessesTable.userId, req.userId));

  const [updated] = await db
    .update(businessesTable)
    .set({ isActive: true, updatedAt: new Date() })
    .where(and(eq(businessesTable.id, parsed.data.businessId), eq(businessesTable.userId, req.userId)))
    .returning();

  res.json(updated);
});

// ─── Business Profile ─────────────────────────────────────────────────────────

router.get("/businesses/me", requireAuth, async (req: any, res): Promise<void> => {
  const business = await getBusinessForUser(req.userId);
  if (!business) {
    res.status(404).json({ error: "Business not found" });
    return;
  }
  res.json(business);
});

router.post("/businesses/me", requireAuth, async (req: any, res): Promise<void> => {
  const parsed = CreateBusinessBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await db
    .update(businessesTable)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(businessesTable.userId, req.userId));

  const [business] = await db
    .insert(businessesTable)
    .values({ ...parsed.data, userId: req.userId, isActive: true })
    .returning();

  res.status(201).json(business);
});

router.patch("/businesses/me", requireAuth, async (req: any, res): Promise<void> => {
  const parsed = UpdateBusinessBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const business = await getBusinessForUser(req.userId);
  if (!business) {
    res.status(404).json({ error: "Business not found" });
    return;
  }

  const [updated] = await db
    .update(businessesTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(businessesTable.id, business.id))
    .returning();

  res.json(updated);
});

// ─── GBP Profiles ─────────────────────────────────────────────────────────────

router.get("/businesses/me/gbp", requireAuth, async (req: any, res): Promise<void> => {
  const business = await getBusinessForUser(req.userId);
  if (!business) {
    res.status(404).json({ error: "Business not found" });
    return;
  }

  const profiles = await db
    .select()
    .from(gbpProfilesTable)
    .where(eq(gbpProfilesTable.businessId, business.id));

  res.json(profiles);
});

router.post("/businesses/me/gbp", requireAuth, async (req: any, res): Promise<void> => {
  const parsed = AddGbpProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const business = await getBusinessForUser(req.userId);
  if (!business) {
    res.status(404).json({ error: "Business not found" });
    return;
  }

  const [profile] = await db
    .insert(gbpProfilesTable)
    .values({ ...parsed.data, businessId: business.id })
    .returning();

  res.status(201).json(profile);
});

router.patch("/businesses/me/gbp/:id", requireAuth, async (req: any, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateGbpProfileParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateGbpProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const business = await getBusinessForUser(req.userId);
  if (!business) {
    res.status(404).json({ error: "Business not found" });
    return;
  }

  const [updated] = await db
    .update(gbpProfilesTable)
    .set(parsed.data)
    .where(and(eq(gbpProfilesTable.id, params.data.id), eq(gbpProfilesTable.businessId, business.id)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "GBP profile not found" });
    return;
  }

  res.json(updated);
});

router.delete("/businesses/me/gbp/:id", requireAuth, async (req: any, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteGbpProfileParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const business = await getBusinessForUser(req.userId);
  if (!business) {
    res.status(404).json({ error: "Business not found" });
    return;
  }

  await db
    .delete(gbpProfilesTable)
    .where(and(eq(gbpProfilesTable.id, params.data.id), eq(gbpProfilesTable.businessId, business.id)));

  res.sendStatus(204);
});

// ─── Websites ─────────────────────────────────────────────────────────────────

router.get("/businesses/me/websites", requireAuth, async (req: any, res): Promise<void> => {
  const business = await getBusinessForUser(req.userId);
  if (!business) {
    res.status(404).json({ error: "Business not found" });
    return;
  }

  const sites = await db
    .select()
    .from(websitesTable)
    .where(eq(websitesTable.businessId, business.id));

  res.json(sites);
});

router.post("/businesses/me/websites", requireAuth, async (req: any, res): Promise<void> => {
  const parsed = AddWebsiteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const business = await getBusinessForUser(req.userId);
  if (!business) {
    res.status(404).json({ error: "Business not found" });
    return;
  }

  const [site] = await db
    .insert(websitesTable)
    .values({ ...parsed.data, businessId: business.id })
    .returning();

  res.status(201).json(site);
});

router.patch("/businesses/me/websites/:id", requireAuth, async (req: any, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateWebsiteParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateWebsiteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const business = await getBusinessForUser(req.userId);
  if (!business) {
    res.status(404).json({ error: "Business not found" });
    return;
  }

  const [updated] = await db
    .update(websitesTable)
    .set(parsed.data)
    .where(and(eq(websitesTable.id, params.data.id), eq(websitesTable.businessId, business.id)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Website not found" });
    return;
  }

  res.json(updated);
});

router.delete("/businesses/me/websites/:id", requireAuth, async (req: any, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteWebsiteParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const business = await getBusinessForUser(req.userId);
  if (!business) {
    res.status(404).json({ error: "Business not found" });
    return;
  }

  await db
    .delete(websitesTable)
    .where(and(eq(websitesTable.id, params.data.id), eq(websitesTable.businessId, business.id)));

  res.sendStatus(204);
});

export default router;
