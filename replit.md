# EMI Tracker

A full-stack app for tracking monthly EMI installment payments — add shops, products, and EMI orders; track payments, due dates, and outstanding balances.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + Clerk auth (`@clerk/express`)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Frontend: React + Vite, Tailwind v4, shadcn/ui, wouter routing
- Auth: Clerk (`@clerk/react`, `@clerk/themes`)

## Where things live

- DB schema: `packages/db/src/schema.ts`
- OpenAPI spec: `packages/api-spec/openapi.yaml`
- Generated Zod schemas: `packages/api-zod/src/`
- Generated React hooks: `packages/api-client-react/src/`
- API routes: `artifacts/api-server/src/routes/`
- Frontend pages: `artifacts/emi-tracker/src/pages/`
- Theme/CSS: `artifacts/emi-tracker/src/index.css`
- Clerk proxy middleware: `artifacts/api-server/src/middlewares/clerkProxyMiddleware.ts`
- Auth guard middleware: `artifacts/api-server/src/middlewares/requireAuth.ts`

## Architecture decisions

- All API routes except `/api/health` are protected by `requireAuth` (Clerk session cookie auth — no Bearer tokens on web).
- Tailwind v4 with `@tailwindcss/vite`; `optimize: false` required so Clerk theme CSS layers aren't reordered in prod builds.
- Home route (`/`) shows landing page for unauthenticated users; redirects to `/dashboard` for authenticated users — never redirect home to sign-in.
- `dueDayOfMonth` field on EMI orders: if set, due date snaps to that day of the month; otherwise falls back to purchase day-of-month.
- `discount` field on EMI orders: `effectivePrice = totalPrice - discount`; monthly installment calculated from effective price.

## Product

- Landing page with sign-in / sign-up CTAs (Bengali UI)
- Clerk auth: email+password and Google OAuth; branded with teal ৳ logo
- Dashboard: summary stats (active EMIs, total outstanding, due this month, overdue)
- Shops: manage shops (name, description)
- EMI Orders: create/track EMI orders per shop/product; record payments; auto-calculate next due date

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Generated files (`packages/api-zod/`, `packages/api-client-react/`) are manually edited — do NOT run `codegen` unless you intend to overwrite manual changes.
- `@layer theme, base, clerk, components, utilities;` must come BEFORE `@import 'tailwindcss'` in `index.css` (Tailwind v4 + Clerk requirement).
- `clerkProxyUrl` is always passed unconditionally to `<ClerkProvider>` — it's empty in dev (intentional) and auto-populated in prod.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
