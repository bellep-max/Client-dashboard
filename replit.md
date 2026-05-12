# AEO Platform

A full-stack SaaS dashboard that helps local business owners optimize their online presence for AI answer engines (ChatGPT, Gemini, Perplexity, etc.).

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at /api)
- `pnpm --filter @workspace/aeo-dashboard run dev` — run the React frontend (port 18277, proxied at /)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui + Wouter routing
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Auth: Clerk (white-label via Replit integration)
- AI: OpenAI via Replit AI proxy (`@workspace/integrations-openai-ai-server`)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- UI: framer-motion, recharts, sonner, react-hook-form

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth for all routes)
- `lib/db/src/schema/businesses.ts` — all core DB schemas (businesses, gbp_profiles, websites, keywords, reports)
- `lib/db/src/schema/conversations.ts` + `messages.ts` — AI chat schema
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/aeo-dashboard/src/pages/` — React pages (landing, onboarding, dashboard, keywords, reports, agent, settings)
- `artifacts/aeo-dashboard/src/App.tsx` — ClerkProvider + Wouter routing setup

## Architecture decisions

- Contract-first API: OpenAPI spec → Orval codegen → React Query hooks + Zod schemas. Never hand-write API hooks.
- Clerk auth is enforced at the route level via `@clerk/express` `getAuth()` middleware — no session table needed.
- All business data is scoped to `userId` from Clerk; one business per user.
- AI chat uses SSE streaming from the backend; frontend uses raw `fetch` (not the generated hook) to consume the stream.
- AI keyword generation uses `gpt-5.4` model via Replit's built-in OpenAI proxy — no user API key needed.

## Product

- **Landing page** (`/`) — public marketing page for AEO Platform
- **Auth** (`/sign-in`, `/sign-up`) — Clerk-powered, dark-themed
- **Multi-step Onboarding** (`/onboarding`) — Business info → GBP profile (with unverified-GBP warning dialog) → Websites → AI keyword generation with efficiency scores
- **Dashboard** (`/dashboard`) — Visibility score, keyword stats, trend badge, latest report card, "Generate Report" action
- **Keywords** (`/keywords`) — Full CRUD, AI generation, suggestions sidebar with efficiency score badges
- **Reports** (`/reports`) — Bi-weekly performance report history with AI summaries
- **AI Agent** (`/agent`) — SSE-streaming AEO strategy chatbot with conversation history, aware of user's business context
- **Settings** (`/settings`) — Edit business profile, manage GBP/websites

## User preferences

- No Recurly payments for now
- No emojis in the UI
- Dark theme by default (navy/indigo + amber/gold accents)
- AI model: `gpt-5.4` via Replit AI proxy
- LLM uses Replit's built-in OpenAI AI integration (no user API key needed)

## Gotchas

- Always run `pnpm --filter @workspace/db run push` after schema changes
- Always run `pnpm --filter @workspace/api-spec run codegen` after OpenAPI spec changes
- Do not use `pnpm dev` at workspace root — use workflow names instead
- SSE route (`POST /api/openai/conversations/:id/messages`) must use raw fetch on the client, not the generated hook
- Conversations table has a `userId` column (added for user isolation) — older schema templates omit it
- `conversationsTable` / `messagesTable` (not `conversations` / `messages`) — naming follows the `Table` suffix convention used by the rest of the schema

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- Clerk skill: `.local/skills/clerk-auth/SKILL.md`
- OpenAI AI integration: `.local/skills/ai-integrations-openai/SKILL.md`
