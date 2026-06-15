import { Router } from "express";
import { db, shopsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  CreateShopBody,
  UpdateShopBody,
  GetShopParams,
  UpdateShopParams,
  DeleteShopParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/shops", async (req, res) => {
  const userId = (req as any).userId;
  const shops = await db.select().from(shopsTable).where(eq(shopsTable.userId, userId)).orderBy(shopsTable.name);
  res.json(shops.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() })));
});

router.post("/shops", async (req, res) => {
  const userId = (req as any).userId;
  const body = CreateShopBody.parse(req.body);
  const [shop] = await db.insert(shopsTable).values({ ...body, userId }).returning();
  res.status(201).json({ ...shop, createdAt: shop.createdAt.toISOString() });
});

router.get("/shops/:id", async (req, res) => {
  const userId = (req as any).userId;
  const { id } = GetShopParams.parse({ id: Number(req.params.id) });
  const [shop] = await db.select().from(shopsTable).where(and(eq(shopsTable.id, id), eq(shopsTable.userId, userId)));
  if (!shop) { res.status(404).json({ error: "Shop not found" }); return; }
  res.json({ ...shop, createdAt: shop.createdAt.toISOString() });
});

router.put("/shops/:id", async (req, res) => {
  const userId = (req as any).userId;
  const { id } = UpdateShopParams.parse({ id: Number(req.params.id) });
  const body = UpdateShopBody.parse(req.body);
  const [shop] = await db.update(shopsTable).set(body).where(and(eq(shopsTable.id, id), eq(shopsTable.userId, userId))).returning();
  if (!shop) { res.status(404).json({ error: "Shop not found" }); return; }
  res.json({ ...shop, createdAt: shop.createdAt.toISOString() });
});

router.delete("/shops/:id", async (req, res) => {
  const userId = (req as any).userId;
  const { id } = DeleteShopParams.parse({ id: Number(req.params.id) });
  await db.delete(shopsTable).where(and(eq(shopsTable.id, id), eq(shopsTable.userId, userId)));
  res.status(204).send();
});

export default router;
