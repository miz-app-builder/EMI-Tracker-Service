import { Router } from "express";
import { db, emiOrdersTable, emiPaymentsTable, shopsTable, customersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  CreateEmiOrderBody,
  UpdateEmiOrderBody,
  GetEmiOrderParams,
  UpdateEmiOrderParams,
  DeleteEmiOrderParams,
  ListEmiOrdersQueryParams,
  ListEmiPaymentsParams,
  CreateEmiPaymentBody,
  CreateEmiPaymentParams,
  DeleteEmiPaymentParams,
} from "@workspace/api-zod";

const router = Router();

function formatOrder(order: Record<string, unknown>, totalPaid: number) {
  const totalPrice = Number(order.totalPrice);
  const downPayment = Number(order.downPayment);
  const emiTotal = totalPrice - downPayment;
  const remaining = Math.max(0, emiTotal - totalPaid);
  return {
    ...order,
    totalPrice,
    downPayment,
    monthlyAmount: Number(order.monthlyAmount),
    totalPaid,
    remainingAmount: remaining,
  };
}

router.get("/emi-orders", async (req, res) => {
  const query = ListEmiOrdersQueryParams.parse(req.query);

  const rows = await db
    .select({
      id: emiOrdersTable.id,
      customerId: emiOrdersTable.customerId,
      shopId: emiOrdersTable.shopId,
      productId: emiOrdersTable.productId,
      productName: emiOrdersTable.productName,
      totalPrice: emiOrdersTable.totalPrice,
      downPayment: emiOrdersTable.downPayment,
      emiMonths: emiOrdersTable.emiMonths,
      monthlyAmount: emiOrdersTable.monthlyAmount,
      status: emiOrdersTable.status,
      purchaseDate: emiOrdersTable.purchaseDate,
      customerName: customersTable.name,
      shopName: shopsTable.name,
    })
    .from(emiOrdersTable)
    .leftJoin(customersTable, eq(emiOrdersTable.customerId, customersTable.id))
    .leftJoin(shopsTable, eq(emiOrdersTable.shopId, shopsTable.id))
    .orderBy(emiOrdersTable.id);

  const filtered = rows.filter((r) => {
    if (query.shopId && r.shopId !== query.shopId) return false;
    if (query.customerId && r.customerId !== query.customerId) return false;
    if (query.status && r.status !== query.status) return false;
    return true;
  });

  // Get total paid for each order
  const orderIds = filtered.map((r) => r.id);
  const paymentTotals: Record<number, number> = {};
  if (orderIds.length > 0) {
    const totals = await db
      .select({
        emiOrderId: emiPaymentsTable.emiOrderId,
        total: sql<string>`COALESCE(SUM(${emiPaymentsTable.amount}), 0)`,
      })
      .from(emiPaymentsTable)
      .groupBy(emiPaymentsTable.emiOrderId);
    totals.forEach((t) => { paymentTotals[t.emiOrderId] = Number(t.total); });
  }

  res.json(filtered.map((r) => formatOrder(r as Record<string, unknown>, paymentTotals[r.id] ?? 0)));
});

router.post("/emi-orders", async (req, res) => {
  const body = CreateEmiOrderBody.parse(req.body);
  const [order] = await db.insert(emiOrdersTable).values({
    customerId: body.customerId,
    shopId: body.shopId,
    productId: body.productId ?? null,
    productName: body.productName,
    totalPrice: String(body.totalPrice),
    downPayment: String(body.downPayment),
    emiMonths: body.emiMonths,
    monthlyAmount: String(body.monthlyAmount),
    purchaseDate: body.purchaseDate,
    status: "active",
  }).returning();

  const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, order.customerId));
  const [shop] = await db.select().from(shopsTable).where(eq(shopsTable.id, order.shopId));

  res.status(201).json(formatOrder({
    ...order,
    customerName: customer?.name ?? null,
    shopName: shop?.name ?? null,
  } as Record<string, unknown>, 0));
});

router.get("/emi-orders/:id", async (req, res) => {
  const { id } = GetEmiOrderParams.parse({ id: Number(req.params.id) });

  const [order] = await db
    .select({
      id: emiOrdersTable.id,
      customerId: emiOrdersTable.customerId,
      shopId: emiOrdersTable.shopId,
      productId: emiOrdersTable.productId,
      productName: emiOrdersTable.productName,
      totalPrice: emiOrdersTable.totalPrice,
      downPayment: emiOrdersTable.downPayment,
      emiMonths: emiOrdersTable.emiMonths,
      monthlyAmount: emiOrdersTable.monthlyAmount,
      status: emiOrdersTable.status,
      purchaseDate: emiOrdersTable.purchaseDate,
      customerName: customersTable.name,
      shopName: shopsTable.name,
    })
    .from(emiOrdersTable)
    .leftJoin(customersTable, eq(emiOrdersTable.customerId, customersTable.id))
    .leftJoin(shopsTable, eq(emiOrdersTable.shopId, shopsTable.id))
    .where(eq(emiOrdersTable.id, id));

  if (!order) { res.status(404).json({ error: "EMI order not found" }); return; }

  const payments = await db
    .select()
    .from(emiPaymentsTable)
    .where(eq(emiPaymentsTable.emiOrderId, id))
    .orderBy(emiPaymentsTable.paymentDate);

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  const formattedOrder = formatOrder(order as Record<string, unknown>, totalPaid);

  res.json({
    ...formattedOrder,
    payments: payments.map((p) => ({
      ...p,
      amount: Number(p.amount),
      createdAt: p.createdAt.toISOString(),
    })),
  });
});

router.put("/emi-orders/:id", async (req, res) => {
  const { id } = UpdateEmiOrderParams.parse({ id: Number(req.params.id) });
  const body = UpdateEmiOrderBody.parse(req.body);

  const updateData: Record<string, unknown> = {};
  if (body.productName !== undefined) updateData.productName = body.productName;
  if (body.totalPrice !== undefined) updateData.totalPrice = String(body.totalPrice);
  if (body.downPayment !== undefined) updateData.downPayment = String(body.downPayment);
  if (body.emiMonths !== undefined) updateData.emiMonths = body.emiMonths;
  if (body.monthlyAmount !== undefined) updateData.monthlyAmount = String(body.monthlyAmount);
  if (body.status !== undefined) updateData.status = body.status;
  if (body.purchaseDate !== undefined) updateData.purchaseDate = body.purchaseDate;

  const [order] = await db.update(emiOrdersTable).set(updateData).where(eq(emiOrdersTable.id, id)).returning();
  if (!order) { res.status(404).json({ error: "EMI order not found" }); return; }

  const paymentsTotals = await db
    .select({ total: sql<string>`COALESCE(SUM(${emiPaymentsTable.amount}), 0)` })
    .from(emiPaymentsTable)
    .where(eq(emiPaymentsTable.emiOrderId, id));

  const totalPaid = Number(paymentsTotals[0]?.total ?? 0);
  res.json(formatOrder(order as Record<string, unknown>, totalPaid));
});

router.delete("/emi-orders/:id", async (req, res) => {
  const { id } = DeleteEmiOrderParams.parse({ id: Number(req.params.id) });
  await db.delete(emiOrdersTable).where(eq(emiOrdersTable.id, id));
  res.status(204).send();
});

// Payments sub-routes
router.get("/emi-orders/:id/payments", async (req, res) => {
  const { id } = ListEmiPaymentsParams.parse({ id: Number(req.params.id) });
  const payments = await db
    .select()
    .from(emiPaymentsTable)
    .where(eq(emiPaymentsTable.emiOrderId, id))
    .orderBy(emiPaymentsTable.paymentDate);

  res.json(payments.map((p) => ({
    ...p,
    amount: Number(p.amount),
    createdAt: p.createdAt.toISOString(),
  })));
});

router.post("/emi-orders/:id/payments", async (req, res) => {
  const { id } = CreateEmiPaymentParams.parse({ id: Number(req.params.id) });
  const body = CreateEmiPaymentBody.parse(req.body);

  const [payment] = await db.insert(emiPaymentsTable).values({
    emiOrderId: id,
    amount: String(body.amount),
    paymentDate: body.paymentDate,
    paymentMethod: body.paymentMethod,
    notes: body.notes ?? null,
  }).returning();

  // Auto-complete order if fully paid
  const [order] = await db.select().from(emiOrdersTable).where(eq(emiOrdersTable.id, id));
  if (order) {
    const totals = await db
      .select({ total: sql<string>`COALESCE(SUM(${emiPaymentsTable.amount}), 0)` })
      .from(emiPaymentsTable)
      .where(eq(emiPaymentsTable.emiOrderId, id));
    const totalPaid = Number(totals[0]?.total ?? 0);
    const emiTotal = Number(order.totalPrice) - Number(order.downPayment);
    if (totalPaid >= emiTotal && order.status !== "completed") {
      await db.update(emiOrdersTable).set({ status: "completed" }).where(eq(emiOrdersTable.id, id));
    }
  }

  res.status(201).json({ ...payment, amount: Number(payment.amount), createdAt: payment.createdAt.toISOString() });
});

router.delete("/payments/:paymentId", async (req, res) => {
  const { paymentId } = DeleteEmiPaymentParams.parse({ paymentId: Number(req.params.paymentId) });
  await db.delete(emiPaymentsTable).where(eq(emiPaymentsTable.id, paymentId));
  res.status(204).send();
});

export default router;
