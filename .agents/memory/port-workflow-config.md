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
2. **`EMI Tracker Frontend` MUST use `isCanvasWorkflow: true`** — without it, the canvas `artifact:v3:default-emi-tracker-frontend` iframe is blank even though the server runs fine. The external proxy (port 5000 → port 80) does not work in canvas mode; `isCanvasWorkflow: true` enables internal artifact routing that does.
3. `PORT` must NOT be a shared env var — it would cause the artifact workflow to also try port 5000, causing EADDRINUSE.
4. `BASE_PATH=/` IS a shared env var — do not delete it.
5. Do NOT create a second frontend or API workflow — duplicate = port conflict.
6. Node.js must be version 22 — Supabase JS requires native WebSocket (Node 22+). Do NOT downgrade.
7. API port is 8080 — Vite proxy `/api` → `http://localhost:8080` is hardcoded. Do NOT change API port.
8. Artifact-managed workflows cannot be deleted or reconfigured by the agent.

**Why:** Replit artifacts inject their own PORT into artifact workflows. The custom `EMI Tracker Frontend` workflow must override with `PORT=5000` in the command (not env var) to avoid the artifact workflow grabbing port 5000 first. And `isCanvasWorkflow: true` switches the canvas from external-proxy routing (broken for port 5000) to internal artifact routing (works).

## How to (re)create EMI Tracker Frontend correctly

```js
await removeWorkflow({ name: "EMI Tracker Frontend" });
await configureWorkflow({
  name: "EMI Tracker Frontend",
  command: "PORT=5000 BASE_PATH=/ pnpm --filter @workspace/emi-tracker run dev",
  waitForPort: 5000,
  outputType: "webview",
  isCanvasWorkflow: true
});
```

## API Server — DO NOT create a custom workflow

`artifacts/api-server: API Server` (Replit-managed) is automatically started by Replit when artifacts are registered and runs on port 8080. Creating a custom `API Server` workflow causes `EADDRINUSE 8080`. **Only one agent-managed workflow is needed: `EMI Tracker Frontend`.** If a custom `API Server` workflow was accidentally created, remove it:

```js
await removeWorkflow({ name: "API Server" });
```

## 502 error on fresh setup

After a fresh clone + workflow configuration, opening the dev URL immediately can return HTTP 502. This is a timing issue — the Replit proxy hasn't fully registered the new workflow connection yet. **Fix: restart `EMI Tracker Frontend` once**, then the URL works.

```js
await restartWorkflow({ workflowName: "EMI Tracker Frontend" });
```

## Symptom → Fix

| Symptom | Fix |
|---|---|
| EADDRINUSE 5000 | Two frontend workflows running. Remove the duplicate. |
| EADDRINUSE 8080 | Custom `API Server` workflow conflicts with artifact-managed one. Remove custom: `removeWorkflow({ name: "API Server" })` |
| 502 on dev URL after fresh setup | Replit proxy timing issue. Restart `EMI Tracker Frontend` once. |
| Preview not visible | `EMI Tracker Frontend` must be PORT=5000. Check workflow command. |
| PORT env var error | Workflow command missing `PORT=5000` or `BASE_PATH=/`. |
| Canvas iframe blank (`artifact:v3:default-emi-tracker-frontend`) | `isCanvasWorkflow: true` missing. Remove and recreate the workflow with that flag. |
| `artifacts/emi-tracker: web` FAILED | Expected if EMI Tracker Frontend grabs port first — ignore. |
