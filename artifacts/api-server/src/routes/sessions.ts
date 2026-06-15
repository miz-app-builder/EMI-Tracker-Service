import { Router } from "express";
import { db, sessionsTable } from "@workspace/db";
import { and, eq, ne, gt } from "drizzle-orm";

const router = Router();

router.get("/sessions", async (req, res) => {
  const userId = (req as any).userId;
  const currentSessionId = (req as any).sessionId as string | undefined;

  const now = new Date();
  const rows = await db
    .select()
    .from(sessionsTable)
    .where(
      and(
        eq(sessionsTable.userId, userId),
        eq(sessionsTable.isRevoked, false),
        gt(sessionsTable.expiresAt, now)
      )
    )
    .orderBy(sessionsTable.lastUsedAt);

  res.json(
    rows.map((s) => ({
      id:           s.id,
      deviceInfo:   s.deviceInfo,
      ipAddress:    s.ipAddress,
      createdAt:    s.createdAt.toISOString(),
      lastUsedAt:   s.lastUsedAt.toISOString(),
      expiresAt:    s.expiresAt.toISOString(),
      isCurrent:    s.id === currentSessionId,
    }))
  );
});

router.delete("/sessions/:sessionId", async (req, res) => {
  const userId = (req as any).userId;
  const { sessionId } = req.params;

  await db
    .update(sessionsTable)
    .set({ isRevoked: true })
    .where(and(eq(sessionsTable.id, sessionId), eq(sessionsTable.userId, userId)));

  res.json({ ok: true });
});

router.delete("/sessions", async (req, res) => {
  const userId = (req as any).userId;
  const currentSessionId = (req as any).sessionId as string | undefined;

  const condition = currentSessionId
    ? and(eq(sessionsTable.userId, userId), ne(sessionsTable.id, currentSessionId))
    : eq(sessionsTable.userId, userId);

  await db.update(sessionsTable).set({ isRevoked: true }).where(condition);

  res.json({ ok: true });
});

export default router;
