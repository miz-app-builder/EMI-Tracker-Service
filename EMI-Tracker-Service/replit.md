# EMI Tracker

A full-stack app for tracking monthly EMI installment payments — add shops, products, and EMI orders; track payments, due dates, and outstanding balances.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` or `SUPABASE_DATABASE_URL` — Postgres connection string
- Required env: `SESSION_SECRET` — JWT signing secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + custom JWT auth (bcryptjs + jsonwebtoken)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- Build: esbuild (CJS bundle)
- Frontend: React + Vite, Tailwind v4, shadcn/ui, wouter routing
- Auth: Custom server-side auth (email + password, JWT in httpOnly cookie)

## Where things live

- DB schema: `lib/db/src/schema/`
- API routes: `artifacts/api-server/src/routes/`
- Auth routes: `artifacts/api-server/src/routes/auth.ts`
- Auth middleware: `artifacts/api-server/src/middlewares/requireAuth.ts`
- Frontend pages: `artifacts/emi-tracker/src/pages/`
- Auth context: `artifacts/emi-tracker/src/contexts/AuthContext.tsx`
- Theme/CSS: `artifacts/emi-tracker/src/index.css`

## Architecture decisions

- All API routes except `/api/health` and `/api/auth/*` are protected by `requireAuth` JWT middleware.
- JWT stored in httpOnly cookie named `emi_token`, signed with `SESSION_SECRET`, 7-day expiry.
- Auth endpoints: `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`.
- `resolveUserId` is now a passthrough (req.userId is the DB UUID directly from JWT payload).
- Home route (`/`) shows landing page for unauthenticated users; redirects to `/dashboard` for authenticated users.
- `dueDayOfMonth` field on EMI orders: if set, due date snaps to that day of the month; otherwise falls back to purchase day-of-month.
- `discount` field on EMI orders: `effectivePrice = totalPrice - discount`; monthly installment calculated from effective price.
- Tailwind v4 with `@tailwindcss/vite`; `@layer theme, base, components, utilities` (no `clerk` layer needed).

## Product

- Landing page with sign-in / sign-up CTAs (Bengali UI)
- Custom auth: email + password; branded with teal ৳ logo
- Sign-up captures name, email, phone, address, password in one step (no email verification)
- Dashboard: summary stats (active EMIs, total outstanding, due this month, overdue)
- Shops: manage shops (name, description)
- EMI Orders: create/track EMI orders per shop/product; record payments; auto-calculate next due date

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Generated files (`packages/api-zod/`, `packages/api-client-react/`) are manually edited — do NOT run `codegen` unless you intend to overwrite manual changes.
- DB schema was migrated manually (SQL) because drizzle-kit push requires TTY for destructive changes. Use the node migration script pattern if schema changes are needed.
- `SUPABASE_DATABASE_URL` takes precedence over `DATABASE_URL`; Supabase connections require `ssl: { rejectUnauthorized: false }`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
