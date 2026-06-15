import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/users/me", async (req, res) => {
  const userId = (req as any).userId;
  const [user] = await db
    .select({ id: usersTable.id, email: usersTable.email, name: usersTable.name, phone: usersTable.phone, address: usersTable.address })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(user);
});

router.patch("/users/me", async (req, res) => {
  const userId = (req as any).userId;
  const { name, phone, address } = req.body;
  const [user] = await db
    .update(usersTable)
    .set({
      ...(name !== undefined && { name }),
      ...(phone !== undefined && { phone }),
      ...(address !== undefined && { address }),
    })
    .where(eq(usersTable.id, userId))
    .returning({ id: usersTable.id, email: usersTable.email, name: usersTable.name, phone: usersTable.phone, address: usersTable.address });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(user);
});

export default router;
