import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, businessesTable, keywordsTable, keywordLinksTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

// ─── Businesses (portal shape) ─────────────────────────────────────────────────

router.get("/businesses", requireAuth, async (req: any, res): Promise<void> => {
  const rows = await db.execute(sql`
    SELECT
      b.id,
      CAST(b.user_id AS INTEGER) AS "clientId",
      b.business_name AS name,
      NULL::text AS "gmbUrl",
      NULL::text AS "websiteUrl",
      NULL::text AS "publishedAddress",
      NULL::text AS "zipCode",
      NULL::text AS city,
      NULL::text AS state,
      NULL::text AS country,
      NULL::text AS "placeId",
      NULL::float AS latitude,
      NULL::float AS longitude,
      NULL::text AS timezone,
      CASE WHEN b.is_active THEN 'active' ELSE 'inactive' END AS status,
      b.industry AS notes,
      b.created_at AS "createdAt",
      (SELECT COUNT(*) FROM keywords k WHERE k.business_id = b.id)::int AS "keywordCount",
      (SELECT COUNT(*) FROM aeo_plans ap WHERE ap.business_id = b.id)::int AS "campaignCount"
    FROM businesses b
    WHERE b.user_id = ${req.userId}
    ORDER BY b.is_active DESC, b.created_at DESC
  `);
  res.json(rows.rows);
});

router.get("/businesses/:id", requireAuth, async (req: any, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const rows = await db.execute(sql`
    SELECT
      b.id,
      CAST(b.user_id AS INTEGER) AS "clientId",
      b.business_name AS name,
      NULL::text AS "gmbUrl",
      NULL::text AS "websiteUrl",
      NULL::text AS "publishedAddress",
      NULL::text AS "zipCode",
      NULL::text AS city,
      NULL::text AS state,
      NULL::text AS country,
      NULL::text AS "placeId",
      NULL::float AS latitude,
      NULL::float AS longitude,
      NULL::text AS timezone,
      CASE WHEN b.is_active THEN 'active' ELSE 'inactive' END AS status,
      b.industry AS notes,
      b.created_at AS "createdAt"
    FROM businesses b
    WHERE b.id = ${id} AND b.user_id = ${req.userId}
  `);

  if (!rows.rows.length) { res.status(404).json({ error: "Not found" }); return; }
  res.json(rows.rows[0]);
});

// ─── AEO Plans / Campaigns ─────────────────────────────────────────────────────

router.post("/aeo-plans", requireAuth, async (req: any, res): Promise<void> => {
  const { name, planType, searchAddress, businessId } = req.body ?? {};
  if (!planType) { res.status(400).json({ error: "planType is required" }); return; }
  if (!businessId) { res.status(400).json({ error: "businessId is required" }); return; }

  // Verify the business belongs to this user
  const bizCheck = await db.execute(sql`SELECT id FROM businesses WHERE id = ${businessId} AND user_id = ${req.userId}`);
  if (!bizCheck.rows.length) { res.status(403).json({ error: "Business not found or not yours" }); return; }

  const inserted = await db.execute(sql`
    INSERT INTO aeo_plans (business_id, name, plan_type, search_address, created_by, created_at, updated_at)
    VALUES (
      ${businessId},
      ${name ?? null},
      ${planType},
      ${searchAddress ?? null},
      ${req.userId},
      NOW(), NOW()
    )
    RETURNING id, name, plan_type AS "planType", search_address AS "searchAddress",
              business_id AS "businessId", created_by AS "createdBy", created_at AS "createdAt"
  `);
  res.status(201).json(inserted.rows[0]);
});

router.get("/aeo-plans", requireAuth, async (req: any, res): Promise<void> => {
  const rows = await db.execute(sql`
    SELECT
      ap.id,
      CAST(b.user_id AS INTEGER) AS "clientId",
      ap.business_id AS "businessId",
      ap.name,
      b.business_name AS "businessName",
      ap.plan_type AS "planType",
      ap.sample_question_1 AS "sampleQuestion1",
      ap.sample_question_2 AS "sampleQuestion2",
      ap.sample_question_3 AS "sampleQuestion3",
      ap.sample_question_4 AS "sampleQuestion4",
      ap.sample_question_5 AS "sampleQuestion5",
      ap.sample_question_6 AS "sampleQuestion6",
      ap.sample_question_7 AS "sampleQuestion7",
      ap.sample_question_8 AS "sampleQuestion8",
      ap.sample_question_9 AS "sampleQuestion9",
      ap.sample_question_10 AS "sampleQuestion10",
      ap.current_answer_presence AS "currentAnswerPresence",
      ap.search_boost_target AS "searchBoostTarget",
      ap.monthly_aeo_budget AS "monthlyAeoBudget",
      ap.schema_implementor AS "schemaImplementor",
      ap.search_address AS "searchAddress",
      ap.subscription_id AS "subscriptionId",
      ap.subscription_start_date AS "subscriptionStartDate",
      ap.next_billing_date AS "nextBillingDate",
      ap.card_last4 AS "cardLast4",
      ap.created_by AS "createdBy",
      ap.created_at AS "createdAt",
      ap.updated_at AS "updatedAt",
      (SELECT COUNT(*) FROM keywords k WHERE k.aeo_plan_id = ap.id)::int AS "keywordCount"
    FROM aeo_plans ap
    LEFT JOIN businesses b ON b.id = ap.business_id
    WHERE b.user_id = ${req.userId} OR ap.business_id IS NULL
    ORDER BY ap.created_at DESC
  `);
  res.json(rows.rows);
});

router.get("/aeo-plans/:id", requireAuth, async (req: any, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const rows = await db.execute(sql`
    SELECT
      ap.id,
      CAST(b.user_id AS INTEGER) AS "clientId",
      ap.business_id AS "businessId",
      ap.name,
      b.business_name AS "businessName",
      ap.plan_type AS "planType",
      ap.sample_question_1 AS "sampleQuestion1",
      ap.sample_question_2 AS "sampleQuestion2",
      ap.sample_question_3 AS "sampleQuestion3",
      ap.sample_question_4 AS "sampleQuestion4",
      ap.sample_question_5 AS "sampleQuestion5",
      ap.sample_question_6 AS "sampleQuestion6",
      ap.sample_question_7 AS "sampleQuestion7",
      ap.sample_question_8 AS "sampleQuestion8",
      ap.sample_question_9 AS "sampleQuestion9",
      ap.sample_question_10 AS "sampleQuestion10",
      ap.current_answer_presence AS "currentAnswerPresence",
      ap.search_boost_target AS "searchBoostTarget",
      ap.monthly_aeo_budget AS "monthlyAeoBudget",
      ap.schema_implementor AS "schemaImplementor",
      ap.search_address AS "searchAddress",
      ap.subscription_id AS "subscriptionId",
      ap.subscription_start_date AS "subscriptionStartDate",
      ap.next_billing_date AS "nextBillingDate",
      ap.card_last4 AS "cardLast4",
      ap.created_by AS "createdBy",
      ap.created_at AS "createdAt",
      ap.updated_at AS "updatedAt"
    FROM aeo_plans ap
    LEFT JOIN businesses b ON b.id = ap.business_id
    WHERE ap.id = ${id}
  `);

  if (!rows.rows.length) { res.status(404).json({ error: "Not found" }); return; }
  res.json(rows.rows[0]);
});

// ─── Keywords (portal/admin shape) ────────────────────────────────────────────

router.get("/keywords", requireAuth, async (req: any, res): Promise<void> => {
  const aeoPlanId = req.query.aeoPlanId ? parseInt(req.query.aeoPlanId, 10) : null;
  const businessId = req.query.businessId ? parseInt(req.query.businessId, 10) : null;

  const rows = await db.execute(sql`
    SELECT
      k.id,
      CAST(b.user_id AS INTEGER) AS "clientId",
      k.business_id AS "businessId",
      k.aeo_plan_id AS "aeoPlanId",
      COALESCE(k.keyword_text, k.keyword) AS "keywordText",
      k.keyword_type AS "keywordType",
      COALESCE(k.is_active, true) AS "isActive",
      k.is_primary AS "isPrimary",
      k.verification_status AS "verificationStatus",
      k.status,
      k.notes,
      k.implemented_by AS "implementedBy",
      k.date_added AS "dateAdded",
      k.created_at AS "createdAt",
      NULL::text AS "clientName",
      b.business_name AS "businessName",
      ap.name AS "campaignName",
      k.last_run_at AS "lastRunAt",
      k.initial_ranking AS "initialRanking",
      k.current_ranking AS "currentRanking",
      COALESCE(k.is_locked, false) AS "isLocked"
    FROM keywords k
    LEFT JOIN businesses b ON b.id = k.business_id
    LEFT JOIN aeo_plans ap ON ap.id = k.aeo_plan_id
    WHERE
      (${aeoPlanId}::int IS NULL OR k.aeo_plan_id = ${aeoPlanId})
      AND (${businessId}::int IS NULL OR k.business_id = ${businessId})
      AND (b.user_id = ${req.userId} OR b.id IS NULL)
    ORDER BY k.created_at DESC
  `);

  // Attach links to each keyword
  const kwIds = (rows.rows as any[]).map((r) => r.id);
  let linksMap: Record<number, any[]> = {};
  if (kwIds.length > 0) {
    const linkRows = await db.execute(sql`
      SELECT id, keyword_id AS "keywordId", url, description, link_type AS "linkType"
      FROM keyword_links
      WHERE keyword_id = ANY(ARRAY[${sql.raw(kwIds.join(","))}]::int[])
    `);
    for (const link of linkRows.rows as any[]) {
      if (!linksMap[link.keywordId]) linksMap[link.keywordId] = [];
      linksMap[link.keywordId].push(link);
    }
  }

  const result = (rows.rows as any[]).map((kw) => ({
    ...kw,
    links: linksMap[kw.id] ?? [],
  }));

  res.json(result);
});

router.get("/keywords/:id", requireAuth, async (req: any, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const rows = await db.execute(sql`
    SELECT
      k.id,
      CAST(b.user_id AS INTEGER) AS "clientId",
      k.business_id AS "businessId",
      k.aeo_plan_id AS "aeoPlanId",
      COALESCE(k.keyword_text, k.keyword) AS "keywordText",
      k.keyword_type AS "keywordType",
      COALESCE(k.is_active, true) AS "isActive",
      k.is_primary AS "isPrimary",
      k.verification_status AS "verificationStatus",
      k.status,
      k.notes,
      k.implemented_by AS "implementedBy",
      k.date_added AS "dateAdded",
      k.created_at AS "createdAt",
      NULL::text AS "clientName",
      b.business_name AS "businessName",
      ap.name AS "campaignName",
      k.last_run_at AS "lastRunAt",
      k.initial_ranking AS "initialRanking",
      k.current_ranking AS "currentRanking",
      COALESCE(k.is_locked, false) AS "isLocked"
    FROM keywords k
    LEFT JOIN businesses b ON b.id = k.business_id
    LEFT JOIN aeo_plans ap ON ap.id = k.aeo_plan_id
    WHERE k.id = ${id}
  `);

  if (!rows.rows.length) { res.status(404).json({ error: "Not found" }); return; }

  const kw = rows.rows[0] as any;
  const linkRows = await db.execute(sql`
    SELECT id, keyword_id AS "keywordId", url, description, link_type AS "linkType"
    FROM keyword_links WHERE keyword_id = ${id}
  `);

  res.json({ ...kw, links: linkRows.rows });
});

// ─── Portal Reports (bi-weekly snapshots) ─────────────────────────────────────

router.get("/reports", requireAuth, async (req: any, res): Promise<void> => {
  const rows = await db.execute(sql`
    SELECT id, user_id AS "userId", title, generated_at AS "generatedAt", summary
    FROM portal_reports
    WHERE user_id = ${req.userId}
    ORDER BY generated_at DESC
    LIMIT 50
  `);
  res.json(rows.rows);
});

router.post("/reports", requireAuth, async (req: any, res): Promise<void> => {
  // Snapshot current rankings for all keywords belonging to this user
  const kwRows = await db.execute(sql`
    SELECT
      k.id,
      COALESCE(k.keyword_text, k.keyword) AS keyword,
      k.initial_ranking AS "initialRanking",
      k.current_ranking AS "currentRanking",
      COALESCE(k.is_locked, false) AS "isLocked",
      b.business_name AS "businessName",
      ap.name AS "campaignName"
    FROM keywords k
    LEFT JOIN businesses b ON b.id = k.business_id
    LEFT JOIN aeo_plans ap ON ap.id = k.aeo_plan_id
    WHERE b.user_id = ${req.userId}
    ORDER BY k.current_ranking ASC NULLS LAST
  `);

  const kws = kwRows.rows as any[];
  const improved = kws.filter(k => k.currentRanking != null && k.initialRanking != null && k.currentRanking < k.initialRanking).length;
  const declined = kws.filter(k => k.currentRanking != null && k.initialRanking != null && k.currentRanking > k.initialRanking).length;
  const locked = kws.filter(k => k.isLocked).length;
  const top3 = kws.filter(k => k.currentRanking != null && k.currentRanking <= 3).length;
  const top10 = kws.filter(k => k.currentRanking != null && k.currentRanking <= 10).length;

  const summary = {
    totalKeywords: kws.length,
    improved,
    declined,
    noChange: kws.length - improved - declined,
    locked,
    top3,
    top10,
    keywords: kws,
    snapshotDate: new Date().toISOString(),
  };

  const title = req.body?.title ?? `Report — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  const inserted = await db.execute(sql`
    INSERT INTO portal_reports (user_id, title, summary, generated_at)
    VALUES (${req.userId}, ${title}, ${JSON.stringify(summary)}, NOW())
    RETURNING id, user_id AS "userId", title, generated_at AS "generatedAt", summary
  `);
  res.status(201).json(inserted.rows[0]);
});

router.get("/reports/:id", requireAuth, async (req: any, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const rows = await db.execute(sql`
    SELECT id, user_id AS "userId", title, generated_at AS "generatedAt", summary
    FROM portal_reports
    WHERE id = ${id} AND user_id = ${req.userId}
  `);
  if (!rows.rows.length) { res.status(404).json({ error: "Not found" }); return; }
  res.json(rows.rows[0]);
});

export default router;
