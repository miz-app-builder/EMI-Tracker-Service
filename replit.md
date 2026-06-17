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

- pnpm workspaces, Node.js 22, TypeScript 5.9
- API: Express 5 + custom JWT auth (bcryptjs + jsonwebtoken)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- Build: esbuild (CJS bundle)
- Frontend: React + Vite, Tailwind v4, shadcn/ui (trimmed), wouter routing
- Auth: Custom server-side auth (email + password, JWT in httpOnly cookie)

## Where things live

- DB schema: `lib/db/src/schema/`
- API routes: `artifacts/api-server/src/routes/`
- Auth routes: `artifacts/api-server/src/routes/auth.ts`
- Auth middleware: `artifacts/api-server/src/middlewares/requireAuth.ts`
- Frontend pages: `artifacts/emi-tracker/src/pages/`
- Frontend UI components: `artifacts/emi-tracker/src/components/ui/` (trimmed — only what's in use)
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
- Tailwind v4 with `@tailwindcss/vite`; `@layer theme, base, components, utilities`.
- PIN Login: `pin_hash` column in `users` table; `hasPinLogin` returned by `/api/auth/me`; `emi_pin_login_active` + `emi_last_email` in localStorage for mobile PIN keypad.
- App lock (PinLockScreen + usePinLock) was removed; replaced with server-side PIN Login.
- Frontend proxies `/api` → `http://localhost:8080` via Vite proxy config — do NOT change API port from 8080.

## Product

- Landing page with sign-in / sign-up CTAs (Bengali UI)
- Custom auth: email + password; branded with teal ৳ logo
- Sign-up captures name, email, phone, address, password in one step (no email verification)
- Dashboard: summary stats (active EMIs, total outstanding, due this month, overdue)
- Shops: manage shops (name, description)
- EMI Orders: create/track EMI orders per shop/product; record payments; auto-calculate next due date

## User preferences

- UI language: Bengali (বাংলা)
- Keep the project lean — remove unused packages and components when found

## ⚠️ Workflow & Port Configuration — READ BEFORE TOUCHING WORKFLOWS

### Running workflows (do NOT remove or duplicate):
| Workflow | Port | Role |
|---|---|---|
| `EMI Tracker Frontend` | **5000** | Webview entry point — custom workflow, PORT=5000 hardcoded in command |
| `artifacts/api-server: API Server` | **8080** | API server — artifact-managed, Replit injects PORT |
| `artifacts/emi-tracker: web` | ~19185 | **IGNORE — Replit-managed only.** Do NOT start/stop/reconfigure/duplicate it. It is NOT the agent-managed frontend. |
| `artifacts/mockup-sandbox: Component Preview Server` | 8081 | Canvas tool — artifact-managed |

### Critical rules:
1. **`EMI Tracker Frontend` command must be:** `PORT=5000 BASE_PATH=/ pnpm --filter @workspace/emi-tracker run dev`
   - `PORT=5000` is the Replit webview port — NEVER change this
   - `BASE_PATH=/` is required by `vite.config.ts` — NEVER omit this
2. **`EMI Tracker Frontend` MUST be configured with `isCanvasWorkflow: true`** — without this, the canvas `artifact:v3:default-emi-tracker-frontend` iframe shows blank. To (re)create it correctly:
   ```js
   await removeWorkflow({ name: "EMI Tracker Frontend" });
   await configureWorkflow({ name: "EMI Tracker Frontend", command: "PORT=5000 BASE_PATH=/ pnpm --filter @workspace/emi-tracker run dev", waitForPort: 5000, outputType: "webview", isCanvasWorkflow: true });
   ```
3. **Do NOT create a custom `API Server` workflow** — `artifacts/api-server: API Server` is already managed by Replit on port 8080. Creating a custom one causes `EADDRINUSE 8080`. If accidentally created, remove it: `removeWorkflow({ name: "API Server" })`
4. **`PORT` must NOT be added to shared env vars** — it would cause the artifact workflow to also grab port 5000 and conflict
5. **`BASE_PATH=/` IS in shared env vars** — do not delete it
6. **Artifact-managed workflows (`artifacts/*`) cannot be deleted or reconfigured** — they are Replit-controlled
7. **Node.js version must be 22** (not 20, not 24) — `@supabase/supabase-js` requires native WebSocket available in Node 22+

### Symptom → Fix:
- `EADDRINUSE 5000`: two frontend workflows running. Remove the duplicate, keep `EMI Tracker Frontend`.
- `EADDRINUSE 8080`: custom `API Server` workflow created — remove it: `removeWorkflow({ name: "API Server" })`. Only `artifacts/api-server: API Server` (Replit-managed) should run on 8080.
- **502 on dev URL after fresh setup**: Replit proxy timing issue — the proxy hasn't registered the new workflow yet. Fix: restart `EMI Tracker Frontend` once.
- App not visible in preview pane: `EMI Tracker Frontend` must be on port 5000. Check workflow command.
- `PORT environment variable is required`: `BASE_PATH` or `PORT` missing from workflow command.
- **Canvas `artifact:v3:default-emi-tracker-frontend` blank**: `EMI Tracker Frontend` is missing `isCanvasWorkflow: true`. Remove and recreate with that flag (see rule 2 above).

## ⚠️ Gotchas — READ BEFORE MAKING CHANGES

- **Generated files** (`packages/api-zod/`, `packages/api-client-react/`) are manually edited — do NOT run `codegen`, it will overwrite manual changes.
- **DB schema changes**: drizzle-kit push requires TTY for destructive changes. Use the inline node script pattern with pg client instead.
- **`SUPABASE_DATABASE_URL` takes precedence** over `DATABASE_URL`; Supabase connections require `ssl: { rejectUnauthorized: false }`.
- **shadcn/ui components**: Only the components currently in `artifacts/emi-tracker/src/components/ui/` are kept. Do NOT add new shadcn components without checking if they're actually needed. The following have been intentionally removed: accordion, alert, alert-dialog, aspect-ratio, breadcrumb, button-group, calendar, carousel, chart, checkbox, collapsible, command, context-menu, drawer, empty, field, form, hover-card, input-group, item, kbd, menubar, navigation-menu, pagination, progress, radio-group, resizable, scroll-area, sheet, sidebar, sonner, spinner, switch, tabs, toggle-group.
- **Typecheck errors** for `@workspace/api-client-react` (TS6305 "output file not built") and implicit `any` (TS7006) are pre-existing and do not affect the running app — Vite ignores them.
- **`framer-motion`, `react-hook-form`, `vaul`, `cmdk`, `react-day-picker`, `embla-carousel-react`, `react-resizable-panels`, `sonner`, `react-icons`** have been removed — do NOT re-add unless a feature explicitly needs them.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
