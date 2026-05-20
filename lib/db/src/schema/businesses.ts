import { pgTable, text, serial, boolean, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const businessesTable = pgTable("businesses", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  businessName: text("business_name").notNull(),
  ownerName: text("owner_name").notNull(),
  subscriberName: text("subscriber_name").notNull(),
  industry: text("industry"),
  description: text("description"),
  onboardingComplete: boolean("onboarding_complete").notNull().default(false),
  isActive: boolean("is_active").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBusinessSchema = createInsertSchema(businessesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBusiness = z.infer<typeof insertBusinessSchema>;
export type Business = typeof businessesTable.$inferSelect;

export const gbpProfilesTable = pgTable("gbp_profiles", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businessesTable.id, { onDelete: "cascade" }),
  placeId: text("place_id"),
  businessName: text("business_name").notNull(),
  address: text("address"),
  category: text("category"),
  isVerified: boolean("is_verified").notNull().default(false),
  phoneNumber: text("phone_number"),
  website: text("website"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertGbpProfileSchema = createInsertSchema(gbpProfilesTable).omit({ id: true, createdAt: true });
export type InsertGbpProfile = z.infer<typeof insertGbpProfileSchema>;
export type GbpProfile = typeof gbpProfilesTable.$inferSelect;

export const websitesTable = pgTable("websites", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businessesTable.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  linkType: text("link_type").notNull(),
  title: text("title"),
  domainAuthority: integer("domain_authority"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertWebsiteSchema = createInsertSchema(websitesTable).omit({ id: true, createdAt: true });
export type InsertWebsite = z.infer<typeof insertWebsiteSchema>;
export type Website = typeof websitesTable.$inferSelect;

export const keywordsTable = pgTable("keywords", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businessesTable.id, { onDelete: "cascade" }),
  keyword: text("keyword").notNull(),
  efficiencyScore: real("efficiency_score"),
  searchVolume: integer("search_volume"),
  currentPosition: integer("current_position"),
  previousPosition: integer("previous_position"),
  isAiGenerated: boolean("is_ai_generated").notNull().default(false),
  notes: text("notes"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertKeywordSchema = createInsertSchema(keywordsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertKeyword = z.infer<typeof insertKeywordSchema>;
export type Keyword = typeof keywordsTable.$inferSelect;

export const keywordLinksTable = pgTable("keyword_links", {
  id: serial("id").primaryKey(),
  keywordId: integer("keyword_id").notNull().references(() => keywordsTable.id, { onDelete: "cascade" }),
  businessId: integer("business_id").notNull().references(() => businessesTable.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  description: text("description"),
  linkType: text("link_type").notNull().default("other"),
  aiLifespanDays: integer("ai_lifespan_days"),
  aiAnalysis: text("ai_analysis"),
  analyzedAt: timestamp("analyzed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertKeywordLinkSchema = createInsertSchema(keywordLinksTable).omit({ id: true, createdAt: true });
export type InsertKeywordLink = z.infer<typeof insertKeywordLinkSchema>;
export type KeywordLink = typeof keywordLinksTable.$inferSelect;

export const reportsTable = pgTable("reports", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businessesTable.id, { onDelete: "cascade" }),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  visibilityScore: real("visibility_score"),
  totalImpressions: integer("total_impressions"),
  totalClicks: integer("total_clicks"),
  averagePosition: real("average_position"),
  keywordsTracked: integer("keywords_tracked").notNull().default(0),
  keywordsImproved: integer("keywords_improved").notNull().default(0),
  keywordsDeclined: integer("keywords_declined").notNull().default(0),
  aiSummary: text("ai_summary"),
  topKeywordsJson: text("top_keywords_json").notNull().default("[]"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertReportSchema = createInsertSchema(reportsTable).omit({ id: true, createdAt: true });
export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reportsTable.$inferSelect;
