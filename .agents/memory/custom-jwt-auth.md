---
name: Custom JWT Auth
description: Clerk fully removed; replaced with bcryptjs + jsonwebtoken email+password auth stored in public.users table.
---

## Auth Architecture

- **Backend packages**: `bcryptjs`, `jsonwebtoken`, `@types/bcryptjs`, `@types/jsonwebtoken` in `@workspace/api-server`
- **JWT cookie**: `emi_token`, httpOnly, sameSite=lax, 7-day expiry, signed with `SESSION_SECRET`
- **Auth routes** (`artifacts/api-server/src/routes/auth.ts`): POST /api/auth/signup, POST /api/auth/login, POST /api/auth/logout, GET /api/auth/me
- **Middleware** (`requireAuth.ts`): reads `emi_token` cookie, verifies JWT, sets `req.userId` to the DB UUID
- **resolveUserId**: now a passthrough (no DB lookup needed — JWT payload already contains UUID)
- **Frontend context**: `artifacts/emi-tracker/src/contexts/AuthContext.tsx` — `useAuth()` hook provides `{ user, loading, refetch, logout }`

## DB Schema (public.users)
- Columns: id (uuid PK), email (text NOT NULL UNIQUE), password_hash (text NOT NULL), name, phone, address, created_at
- `clerk_id` and `profile_completed` columns were dropped

**Why:** User requested complete removal of Clerk (frontend + backend) in favor of self-managed auth with user data in server's own PostgreSQL users table.

**How to apply:** All protected routes use `requireAuth` middleware. Auth routes are mounted without middleware in `routes/index.ts`. Frontend gates pages via `useAuth()` in App.tsx.
