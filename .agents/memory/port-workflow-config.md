---
name: Port & Workflow Configuration
description: Critical port and workflow setup for EMI Tracker on Replit — prevents recurring port and webview issues.
---

# Port & Workflow Configuration

## Rule
- All workflows are now artifact-managed — do NOT create custom duplicate workflows for frontend or API.
- API server runs on port 8080.
- Node.js version must be 22 (not 20) — Supabase JS requires native WebSocket (Node 22+).
- `BASE_PATH=/` must exist as a shared env var (Replit injects it into artifact workflows automatically).

**Why:** When Replit adds artifact workflows, they inject PORT and BASE_PATH automatically. Any custom workflow with the same command will grab the same port first (EADDRINUSE), causing the artifact workflow to fail.

**How to apply:** Do NOT create custom `EMI Tracker Frontend` or `API Server` workflows — use the artifact-managed ones exclusively:
- `artifacts/emi-tracker: web` — frontend, Replit-injected PORT (~19185) + BASE_PATH
- `artifacts/api-server: API Server` — API, port 8080
- `artifacts/mockup-sandbox: Component Preview Server` — canvas, port 8081

## Symptom → Fix
- `artifacts/emi-tracker: web` FAILED "Port XXXXX already in use": a custom frontend workflow is squatting on the same port. Remove the custom workflow.
- `artifacts/api-server: API Server` FAILED "EADDRINUSE 8080": a custom API Server workflow is running. Remove it.
- `vite.config.ts` throws "PORT environment variable is required": only happens if running outside the artifact context; Replit injects PORT for artifact workflows automatically.
