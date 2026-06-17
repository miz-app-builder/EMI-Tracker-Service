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
- PIN Login endpoints: `POST /api/auth/set-pin-login` (protected), `DELETE /api/auth/pin-login` (protected), `POST /api/auth/pin-login` (public, takes email+pin).
- `resolveUserId` is now a passthrough (req.userId is the DB UUID directly from JWT payload).
- Home route (`/`) shows landing page for unauthenticated users; redirects to `/dashboard` for authenticated users.
- `dueDayOfMonth` field on EMI orders: if set, due date snaps to that day of the month; otherwise falls back to purchase day-of-month.
- `discount` field on EMI orders: `effectivePrice = totalPrice - discount`; monthly installment calculated from effective price.
- Tailwind v4 with `@tailwindcss/vite`; `@layer theme, base, components, utilities` (no `clerk` layer needed).
- PIN Login: `pin_hash` column in `users` table; `hasPinLogin` returned by `/api/auth/me`; `emi_pin_login_active` + `emi_last_email` in localStorage for mobile PIN keypad.
- App lock (PinLockScreen + usePinLock) was removed; replaced with server-side PIN Login.

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

## Workflow & Port Configuration (IMPORTANT)

- **Node.js version: 22** (not 20) — required for native WebSocket support used by `@supabase/supabase-js`. Do NOT downgrade.
- **Frontend workflow**: `EMI Tracker Frontend` — command `PORT=5000 BASE_PATH=/ pnpm --filter @workspace/emi-tracker run dev`, port 5000, outputType `webview`. This is the Replit webview entry point. Do NOT change the port.
- **API workflow**: handled by artifact-managed `artifacts/api-server: API Server` on port 8080.
- **`BASE_PATH=/`** is set as a shared env var — required by `vite.config.ts`, do not remove.
- **Port mapping**: 5000 → external 80 (webview), 8080 → external 8080 (API).
- Replit auto-creates artifact-managed workflows (`artifacts/emi-tracker: web`, `artifacts/api-server: API Server`, `artifacts/mockup-sandbox: Component Preview Server`) that **cannot be deleted or reconfigured**. They run alongside the custom `EMI Tracker Frontend` workflow — this is expected and fine.
- If the webview shows port 3001, it means the frontend is incorrectly running on port 3000 instead of 5000. Fix: reconfigure `EMI Tracker Frontend` to use `PORT=5000`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
