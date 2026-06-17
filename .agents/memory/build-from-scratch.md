---
name: Build From Scratch
description: Complete step-by-step guide to set up and run the EMI Tracker project on Replit from a fresh clone — covers all known pitfalls.
---

# EMI Tracker — Build From Scratch

Follow these steps in order. Skipping steps causes hard-to-debug failures.

---

## Step 1 — Environment secrets (required before anything runs)

These must exist as Replit secrets (env vars). Check with `viewEnvVars()`. If missing, ask the user.

| Secret | Purpose |
|---|---|
| `SUPABASE_DATABASE_URL` | Postgres connection string (takes precedence over `DATABASE_URL`) |
| `SESSION_SECRET` | JWT signing secret (any strong random string) |
| `SUPABASE_URL` | Supabase project URL (used by supabase-js client) |
| `SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |

`SUPABASE_DATABASE_URL` requires `ssl: { rejectUnauthorized: false }` — this is already configured in `lib/db/src/index.ts`, do not remove it.

---

## Step 2 — Install dependencies

```bash
pnpm install
```

Node.js must be **22** (not 20, not 24). `@supabase/supabase-js` requires native WebSocket available in Node 22+.

If Node version is wrong, change it in `.replit` (modules section) and reinstall.

---

## Step 3 — Shared env var `BASE_PATH=/`

`BASE_PATH=/` must be in the shared env vars (`.replit` `[userenv.shared]` section). The Vite config reads `process.env.BASE_PATH` and throws if missing.

Do NOT add `PORT` to shared env vars — it would cause the artifact workflow to also grab port 5000 and cause `EADDRINUSE`.

---

## Step 4 — Configure the two custom workflows

### 4a. EMI Tracker Frontend (webview, port 5000)

**⚠️ MUST use `isCanvasWorkflow: true`** — without it the canvas iframe `artifact:v3:default-emi-tracker-frontend` is blank even though the server runs. The external proxy (port 5000 → external port 80) does not work inside the Replit canvas; `isCanvasWorkflow: true` enables internal artifact routing that does.

```js
// If workflow already exists, remove it first:
await removeWorkflow({ name: "EMI Tracker Frontend" });

await configureWorkflow({
  name: "EMI Tracker Frontend",
  command: "PORT=5000 BASE_PATH=/ pnpm --filter @workspace/emi-tracker run dev",
  waitForPort: 5000,
  outputType: "webview",
  isCanvasWorkflow: true
});
```

### 4b. API Server (console, port 8080)

```js
await configureWorkflow({
  name: "API Server",
  command: "PORT=8080 pnpm --filter @workspace/api-server run dev",
  waitForPort: 8080,
  outputType: "console"
});
```

### 4c. Project (run button — runs both)

```js
await configureWorkflow({
  name: "Project",
  command: "workflow.run EMI Tracker Frontend && workflow.run API Server",
  outputType: "console"
});
```

Note: Replit also auto-creates artifact-managed workflows when artifacts are registered:
- `artifacts/api-server: API Server` (port 8080) — do NOT touch
- `artifacts/emi-tracker: web` (~19185) — do NOT touch; it powers the `artifact:v3:artifacts/emi-tracker` canvas iframe
- `artifacts/mockup-sandbox: Component Preview Server` (8081) — canvas tool

Do NOT duplicate any of these. If you see `EADDRINUSE 5000` or `EADDRINUSE 8080`, a duplicate workflow exists — remove it.

---

## Step 5 — Verify everything is running

Logs to check:

```
API Server:            [INFO] Server listening { port: 8080 }
EMI Tracker Frontend:  VITE v7.x  ready in Xms   Local: http://localhost:5000/
```

Take a screenshot to confirm the landing page loads.

---

## Step 6 — Canvas iframes

After all workflows are running there will be two canvas iframes:

| Canvas iframe ID | Connected to | Status |
|---|---|---|
| `artifact:v3:default-emi-tracker-frontend` | `EMI Tracker Frontend` workflow (port 5000) | ✅ works only if `isCanvasWorkflow: true` was set |
| `artifact:v3:artifacts/emi-tracker` | `artifacts/emi-tracker: web` (~19185) | ✅ always works (artifact-managed internal routing) |

If `artifact:v3:default-emi-tracker-frontend` is blank → re-run step 4a.

---

## Known pitfalls

| Problem | Cause | Fix |
|---|---|---|
| Canvas iframe blank | `isCanvasWorkflow: true` missing on `EMI Tracker Frontend` | Remove and recreate workflow (step 4a) |
| `EADDRINUSE 5000` | Duplicate frontend workflow | Remove the duplicate, keep `EMI Tracker Frontend` |
| `EADDRINUSE 8080` | Duplicate API workflow | Remove the duplicate, keep `API Server` |
| `BASE_PATH is required` / Vite crash | `BASE_PATH` missing from workflow command or shared env | Add `BASE_PATH=/` to workflow command AND shared env |
| DB connection error | Missing/wrong `SUPABASE_DATABASE_URL` or missing `ssl` config | Check secret; `ssl: { rejectUnauthorized: false }` must stay in `lib/db/src/index.ts` |
| `codegen` corrupts packages | Running codegen overwrites manually-edited files | NEVER run codegen; `packages/api-zod/` and `packages/api-client-react/` are manually maintained |
| TypeScript errors in `@workspace/api-client-react` | Pre-existing TS6305 / TS7006 — known issue | Ignore; Vite skips them at runtime |
| Webview "No logs received yet" in canvas | Canvas iframe not connected to workflow | Check canvas iframe state; fix step 4a if needed |

---

## What NOT to change

- API port (8080) — hardcoded in Vite proxy config `artifacts/emi-tracker/vite.config.ts`
- Frontend port (5000) — hardcoded as Replit webview port
- Node version (22) — Supabase requirement
- `lib/db/src/index.ts` ssl config — Supabase requires it
- `packages/api-zod/`, `packages/api-client-react/` — manually edited, do NOT codegen
- Artifact-managed workflows — Replit-controlled, do NOT reconfigure or delete
