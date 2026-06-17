---
name: Port & Workflow Configuration
description: Critical port and workflow setup for EMI Tracker on Replit — prevents recurring port and webview issues.
---

# Port & Workflow Configuration

## The correct running state

| Workflow | Port | Command |
|---|---|---|
| `EMI Tracker Frontend` | 5000 (webview) | `PORT=5000 BASE_PATH=/ pnpm --filter @workspace/emi-tracker run dev` |
| `artifacts/api-server: API Server` | 8080 | Replit artifact-managed, do not touch |
| `artifacts/emi-tracker: web` | ~19185 | Replit artifact-managed, runs alongside, may fail — that's OK |
| `artifacts/mockup-sandbox: Component Preview Server` | 8081 | Replit artifact-managed, canvas tool |

## Rules — never break these

1. `EMI Tracker Frontend` command must include `PORT=5000` AND `BASE_PATH=/` — both are required by `vite.config.ts` which throws on missing values.
2. `PORT` must NOT be a shared env var — it would cause the artifact workflow to also try port 5000, causing EADDRINUSE.
3. `BASE_PATH=/` IS a shared env var — do not delete it.
4. Do NOT create a second frontend or API workflow — duplicate = port conflict.
5. Node.js must be version 22 — Supabase JS requires native WebSocket (Node 22+). Do NOT downgrade.
6. API port is 8080 — Vite proxy `/api` → `http://localhost:8080` is hardcoded. Do NOT change API port.
7. Artifact-managed workflows cannot be deleted or reconfigured by the agent.

**Why:** Replit artifacts inject their own PORT into artifact workflows. The custom `EMI Tracker Frontend` workflow must override with `PORT=5000` in the command (not env var) to avoid the artifact workflow grabbing port 5000 first.

## Symptom → Fix

| Symptom | Fix |
|---|---|
| EADDRINUSE 5000 | Two frontend workflows running. Remove the duplicate. |
| EADDRINUSE 8080 | Two API workflows running. Remove the duplicate. |
| Preview not visible | `EMI Tracker Frontend` must be PORT=5000. Check workflow command. |
| PORT env var error | Workflow command missing `PORT=5000` or `BASE_PATH=/`. |
| `artifacts/emi-tracker: web` FAILED | Expected if EMI Tracker Frontend grabs port first — ignore. |
