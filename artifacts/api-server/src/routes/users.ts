import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.post("/users/me", async (req, res) => {
  const clerkId = (req as any).userId;
  const { email, name } = req.body;

  if (!email) {
    res.status(400).json({ error: "email is required" });
    return;
  }

  const [user] = await db
    .insert(usersTable)
    .values({ clerkId, email, name: name ?? null })
    .onConflictDoUpdate({
      target: usersTable.clerkId,
      set: { email, name: name ?? null },
    })
    .returning();

  res.json(user);
});

router.get("/users/me", async (req, res) => {
  const clerkId = (req as any).userId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(user);
});

export default router;
