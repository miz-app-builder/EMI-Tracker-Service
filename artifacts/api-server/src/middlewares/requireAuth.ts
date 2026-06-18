import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { db, sessionsTable } from "@workspace/db";
import { and, eq, gt } from "drizzle-orm";
import { supabaseAdmin, decodeJwtPayload } from "../lib/supabase";

const COOKIE_NAME = "emi_token";

export function extractToken(req: Request): string | null {
  const authHeader = req.headers["authorization"];
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return (req as any).cookies?.[COOKIE_NAME] ?? null;
}

async function checkSession(sessionId: string): Promise<boolean> {
  const now = new Date();
  const [session] = await db
    .select({ id: sessionsTable.id })
    .from(sessionsTable)
    .where(
      and(
        eq(sessionsTable.id, sessionId),
        eq(sessionsTable.isRevoked, false),
        gt(sessionsTable.expiresAt, now)
      )
    );
  if (!session) return false;
  db.update(sessionsTable)
    .set({ lastUsedAt: now })
    .where(eq(sessionsTable.id, sessionId))
    .catch(() => {});
  return true;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Try Supabase auth first
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (!error && user) {
    const payload = decodeJwtPayload(token);
    const sessionId = payload.session_id as string | undefined;
    if (sessionId) {
      const ok = await checkSession(sessionId);
      if (!ok) {
        res.status(401).json({ error: "Session revoked or expired" });
        return;
      }
    }
    (req as any).userId = user.id;
    (req as any).sessionId = sessionId;
    next();
    return;
  }

  // Fallback: custom JWT (PIN login / biometric login)
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    res.status(500).json({ error: "Server misconfigured" });
    return;
  }
  try {
    const payload = jwt.verify(token, secret) as { userId: string; sessionId?: string };
    if (payload.sessionId) {
      const ok = await checkSession(payload.sessionId);
      if (!ok) {
        res.status(401).json({ error: "Session revoked or expired" });
        return;
      }
    }
    (req as any).userId = payload.userId;
    (req as any).sessionId = payload.sessionId;
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}
