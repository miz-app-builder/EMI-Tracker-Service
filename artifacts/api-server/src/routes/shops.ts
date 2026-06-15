import { Router } from "express";
import { db, shopsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateShopBody,
  UpdateShopBody,
  GetShopParams,
  UpdateShopParams,
  DeleteShopParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/shops", async (req, res) => {
  const shops = await db.select().from(shopsTable).orderBy(shopsTable.name);
  res.json(shops.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() })));
});

router.post("/shops", async (req, res) => {
  const body = CreateShopBody.parse(req.body);
  const [shop] = await db.insert(shopsTable).values(body).returning();
  res.status(201).json({ ...shop, createdAt: shop.createdAt.toISOString() });
});

router.get("/shops/:id", async (req, res) => {
  const { id } = GetShopParams.parse({ id: Number(req.params.id) });
  const [shop] = await db.select().from(shopsTable).where(eq(shopsTable.id, id));
  if (!shop) { res.status(404).json({ error: "Shop not found" }); return; }
  res.json({ ...shop, createdAt: shop.createdAt.toISOString() });
});

router.put("/shops/:id", async (req, res) => {
  const { id } = UpdateShopParams.parse({ id: Number(req.params.id) });
  const body = UpdateShopBody.parse(req.body);
  const [shop] = await db.update(shopsTable).set(body).where(eq(shopsTable.id, id)).returning();
  if (!shop) { res.status(404).json({ error: "Shop not found" }); return; }
  res.json({ ...shop, createdAt: shop.createdAt.toISOString() });
});

router.delete("/shops/:id", async (req, res) => {
  const { id } = DeleteShopParams.parse({ id: Number(req.params.id) });
  await db.delete(shopsTable).where(eq(shopsTable.id, id));
  res.status(204).send();
});

export default router;
