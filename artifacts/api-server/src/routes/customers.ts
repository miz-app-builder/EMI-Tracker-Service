import { Router } from "express";
import { db, customersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateCustomerBody,
  UpdateCustomerBody,
  GetCustomerParams,
  UpdateCustomerParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/customers", async (req, res) => {
  const customers = await db.select().from(customersTable).orderBy(customersTable.name);
  res.json(customers.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() })));
});

router.post("/customers", async (req, res) => {
  const body = CreateCustomerBody.parse(req.body);
  const [customer] = await db.insert(customersTable).values(body).returning();
  res.status(201).json({ ...customer, createdAt: customer.createdAt.toISOString() });
});

router.get("/customers/:id", async (req, res) => {
  const { id } = GetCustomerParams.parse({ id: Number(req.params.id) });
  const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, id));
  if (!customer) { res.status(404).json({ error: "Customer not found" }); return; }
  res.json({ ...customer, createdAt: customer.createdAt.toISOString() });
});

router.put("/customers/:id", async (req, res) => {
  const { id } = UpdateCustomerParams.parse({ id: Number(req.params.id) });
  const body = UpdateCustomerBody.parse(req.body);
  const [customer] = await db.update(customersTable).set(body).where(eq(customersTable.id, id)).returning();
  if (!customer) { res.status(404).json({ error: "Customer not found" }); return; }
  res.json({ ...customer, createdAt: customer.createdAt.toISOString() });
});

export default router;
