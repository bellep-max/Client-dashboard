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
- Required env: `SESSION_SECRET` — JWT signing secret (falls back to env var name if absent)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui + Wouter routing
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Auth: Custom JWT auth (httpOnly cookie `token`), bcryptjs password hashing — no external auth provider
- Validation: Zod, `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- UI: framer-motion, recharts, sonner, react-hook-form

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth for all routes)
- `lib/db/src/schema/users.ts` — users table (id, email, name, passwordHash, createdAt)
- `lib/db/src/schema/businesses.ts` — all core DB schemas (businesses, gbp_profiles, websites, keywords, reports)
- `artifacts/api-server/src/lib/auth.ts` — JWT sign/verify helpers + `requireAuth` Express middleware
- `artifacts/api-server/src/routes/auth.ts` — POST /api/auth/register, /login, /logout; GET /api/auth/me
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/aeo-dashboard/src/contexts/AuthContext.tsx` — AuthProvider + useAuth hook
- `artifacts/aeo-dashboard/src/pages/` — React pages (landing, onboarding, dashboard, keywords, reports, settings, sign-in, sign-up)
- `artifacts/aeo-dashboard/src/App.tsx` — AuthProvider + Wouter routing setup

## Architecture decisions

- Contract-first API: OpenAPI spec → Orval codegen → React Query hooks + Zod schemas. Never hand-write API hooks.
- JWT stored as httpOnly cookie named `token`; payload `{ userId, email, name }`. Secret from `SESSION_SECRET` env var.
- All business data is scoped to `userId` (string version of numeric users.id); one business per user (or multiple with switcher).
- `requireAuth` middleware in each protected route reads and verifies the JWT cookie, sets `req.userId`.
- AuthContext in the frontend calls `GET /api/auth/me` on mount to restore session; exposes `user`, `isLoaded`, `refetch`, `signOut`.
- No Clerk, no external auth dependencies.

## Product

- **Landing page** (`/`) — public marketing page; shows sign-up CTA when logged out, redirects to dashboard when logged in
- **Auth** (`/sign-in`, `/sign-up`) — custom dark-themed forms using JWT cookie auth
- **Multi-step Onboarding** (`/onboarding`) — Business info → GBP profile (with unverified-GBP warning dialog) → Websites → Keywords
- **Dashboard** (`/dashboard`) — Visibility score, keyword stats, trend badge, latest report card, "Generate Report" action
- **Keywords** (`/keywords`) — Full CRUD, keyword backlinks with AI scores, suggestions sidebar
- **Reports** (`/reports`) — Bi-weekly performance report history with AI summaries
- **Settings** (`/settings`) — Edit business profile, manage GBP/websites
- **Sidebar** — Shows all businesses with active switcher

## User preferences

- No external auth (no Clerk, no Recurly)
- No emojis in the UI
- Dark theme by default (navy/indigo + amber/gold accents)
- Single-word keywords only
- Keyword backlinks with AI scores
- Sidebar shows all businesses with switcher

## Gotchas

- Always run `pnpm --filter @workspace/db run push` after schema changes
- Always run `pnpm --filter @workspace/api-spec run codegen` after OpenAPI spec changes
- Do not use `pnpm dev` at workspace root — use workflow names instead
- `conversationsTable` / `messagesTable` (not `conversations` / `messages`) — naming follows the `Table` suffix convention
- JWT secret: `process.env.JWT_SECRET || process.env.SESSION_SECRET` — ensure `SESSION_SECRET` is set

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- OpenAI AI integration (if needed): `.local/skills/ai-integrations-openai/SKILL.md`
