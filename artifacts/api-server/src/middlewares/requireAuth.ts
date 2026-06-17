import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { db, sessionsTable } from "@workspace/db";
import { and, eq, gt } from "drizzle-orm";

const COOKIE_NAME = "emi_token";

export function extractToken(req: Request): string | null {
  const authHeader = req.headers["authorization"];
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return (req as any).cookies?.[COOKIE_NAME] ?? null;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    res.status(500).json({ error: "Server misconfigured: SESSION_SECRET missing" });
    return;
  }
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const payload = jwt.verify(token, secret) as { userId: string; email: string; sessionId?: string };
    (req as any).userId = payload.userId;
    (req as any).sessionId = payload.sessionId;

    if (payload.sessionId) {
      const now = new Date();
      const [session] = await db
        .select({ id: sessionsTable.id })
        .from(sessionsTable)
        .where(
          and(
            eq(sessionsTable.id, payload.sessionId),
            eq(sessionsTable.isRevoked, false),
            gt(sessionsTable.expiresAt, now)
          )
        );

      if (!session) {
        res.status(401).json({ error: "Session revoked or expired" });
        return;
      }

      db.update(sessionsTable)
        .set({ lastUsedAt: now })
        .where(eq(sessionsTable.id, payload.sessionId))
        .catch(() => {});
    }

    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}
