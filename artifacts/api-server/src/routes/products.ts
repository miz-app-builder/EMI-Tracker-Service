import { Router } from "express";
import { db, productsTable, shopsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateProductBody, ListProductsQueryParams } from "@workspace/api-zod";

const router = Router();

router.get("/products", async (req, res) => {
  const query = ListProductsQueryParams.parse(req.query);

  const rows = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      shopId: productsTable.shopId,
      price: productsTable.price,
      shopName: shopsTable.name,
    })
    .from(productsTable)
    .leftJoin(shopsTable, eq(productsTable.shopId, shopsTable.id))
    .orderBy(productsTable.name);

  const filtered = query.shopId
    ? rows.filter((r) => r.shopId === query.shopId)
    : rows;

  res.json(
    filtered.map((r) => ({
      ...r,
      price: r.price !== null ? Number(r.price) : null,
    }))
  );
});

router.post("/products", async (req, res) => {
  const body = CreateProductBody.parse(req.body);
  const [product] = await db.insert(productsTable).values({
    name: body.name,
    shopId: body.shopId,
    price: body.price !== undefined && body.price !== null ? String(body.price) : null,
  }).returning();
  res.status(201).json({
    id: product.id,
    name: product.name,
    shopId: product.shopId,
    price: product.price !== null ? Number(product.price) : null,
    shopName: null,
  });
});

export default router;
