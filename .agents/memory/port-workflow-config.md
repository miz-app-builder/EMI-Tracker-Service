---
name: Port & Workflow Configuration
description: Critical port and workflow setup for EMI Tracker on Replit — prevents recurring port and webview issues.
---

# Port & Workflow Configuration

## Rule
- Frontend MUST run on port 5000 with `PORT=5000 BASE_PATH=/` — this is the Replit webview port.
- API server runs on port 8080.
- Node.js version must be 22 (not 20) — Supabase JS requires native WebSocket (Node 22+).
- `BASE_PATH=/` must exist as a shared env var.

**Why:** Replit's webview only works on port 5000 (maps to external port 80). The old config used port 3000 → external 3001, which broke the webview. `@supabase/realtime-js` crashes on Node 20 with no native WebSocket.

**How to apply:** If the frontend workflow is ever recreated or reconfigured, always use:
- command: `PORT=5000 BASE_PATH=/ pnpm --filter @workspace/emi-tracker run dev`
- waitForPort: 5000
- outputType: webview

## Artifact-managed workflows (cannot delete/reconfigure)
Replit auto-creates these — they run alongside the custom workflow and cannot be removed:
- `artifacts/emi-tracker: web` — runs on a random internal port, not the webview port. Harmless.
- `artifacts/api-server: API Server` — runs on port 8080 (same as needed). If it conflicts with a custom API Server workflow, remove the custom one.
- `artifacts/mockup-sandbox: Component Preview Server` — canvas tool, port 8081.

## Symptom → Fix
- Webview shows port 3001: frontend is on port 3000, not 5000. Reconfigure `EMI Tracker Frontend` to `PORT=5000`.
- API server EADDRINUSE 8080: two API server workflows running at once. Remove the custom one, keep artifact-managed.
- `artifacts/emi-tracker: web` finishes with SIGTERM: expected when `EMI Tracker Frontend` occupies port 5000. Not a problem.
