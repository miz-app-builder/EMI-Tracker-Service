import { Router } from "express";
import { db, emiOrdersTable, emiPaymentsTable, shopsTable } from "@workspace/db";
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

function calcNextDueDate(
  purchaseDate: string,
  emiMonths: number,
  installmentsPaid: number,
  dueDayOfMonth?: number | null,
): string | null {
  if (installmentsPaid >= emiMonths) return null;
  const next = installmentsPaid + 1;
  const date = new Date(purchaseDate);
  date.setMonth(date.getMonth() + next);

  if (dueDayOfMonth) {
    // Clamp to last day of that month (e.g. 31 in February → 28/29)
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    date.setDate(Math.min(dueDayOfMonth, lastDay));
  }

  return date.toISOString().split("T")[0];
}

function formatOrder(order: Record<string, unknown>, totalPaid: number, installmentsPaid: number) {
  const totalPrice = Number(order.totalPrice);
  const discount = Number(order.discount ?? 0);
  const downPayment = Number(order.downPayment);
  const emiMonths = Number(order.emiMonths);
  const dueDayOfMonth = order.dueDayOfMonth as number | null | undefined;
  const effectivePrice = totalPrice - discount;
  const emiTotal = effectivePrice - downPayment;
  const remaining = Math.max(0, emiTotal - totalPaid);
  const remainingMonths = Math.max(0, emiMonths - installmentsPaid);

  // Dynamic next monthly amount: remaining balance divided by remaining months
  const nextMonthlyAmount = remainingMonths > 0 ? Math.ceil(remaining / remainingMonths) : 0;

  const nextDueDate = order.status === "completed"
    ? null
    : calcNextDueDate(order.purchaseDate as string, emiMonths, installmentsPaid, dueDayOfMonth);

  return {
    ...order,
    totalPrice,
    discount,
    downPayment,
    monthlyAmount: Number(order.monthlyAmount),
    dueDayOfMonth: dueDayOfMonth ?? null,
    totalPaid,
    remainingAmount: remaining,
    installmentsPaid,
    nextDueDate,
    nextMonthlyAmount,
  };
}

router.get("/emi-orders", async (req, res) => {
  const query = ListEmiOrdersQueryParams.parse(req.query);

  const rows = await db
    .select({
      id: emiOrdersTable.id,
      shopId: emiOrdersTable.shopId,
      productId: emiOrdersTable.productId,
      productName: emiOrdersTable.productName,
      totalPrice: emiOrdersTable.totalPrice,
      discount: emiOrdersTable.discount,
      downPayment: emiOrdersTable.downPayment,
      emiMonths: emiOrdersTable.emiMonths,
      monthlyAmount: emiOrdersTable.monthlyAmount,
      dueDayOfMonth: emiOrdersTable.dueDayOfMonth,
      status: emiOrdersTable.status,
      purchaseDate: emiOrdersTable.purchaseDate,
      shopName: shopsTable.name,
    })
    .from(emiOrdersTable)
    .leftJoin(shopsTable, eq(emiOrdersTable.shopId, shopsTable.id))
    .orderBy(emiOrdersTable.id);

  const filtered = rows.filter((r) => {
    if (query.shopId && r.shopId !== query.shopId) return false;
    if (query.status && r.status !== query.status) return false;
    return true;
  });

  const orderIds = filtered.map((r) => r.id);
  const paymentStats: Record<number, { total: number; count: number }> = {};
  if (orderIds.length > 0) {
    const stats = await db
      .select({
        emiOrderId: emiPaymentsTable.emiOrderId,
        total: sql<string>`COALESCE(SUM(${emiPaymentsTable.amount}), 0)`,
        count: sql<string>`COUNT(*)`,
      })
      .from(emiPaymentsTable)
      .groupBy(emiPaymentsTable.emiOrderId);
    stats.forEach((s) => {
      paymentStats[s.emiOrderId] = { total: Number(s.total), count: Number(s.count) };
    });
  }

  res.json(
    filtered.map((r) => {
      const stats = paymentStats[r.id] ?? { total: 0, count: 0 };
      return formatOrder(r as Record<string, unknown>, stats.total, stats.count);
    })
  );
});

router.post("/emi-orders", async (req, res) => {
  const body = CreateEmiOrderBody.parse(req.body);

  // Auto-calculate monthly amount: (totalPrice - discount - downPayment) / months
  const discount = body.discount ?? 0;
  const effectivePrice = body.totalPrice - discount;
  const emiTotal = effectivePrice - body.downPayment;
  const monthlyAmount = body.emiMonths > 0 ? Math.ceil(emiTotal / body.emiMonths) : 0;

  const [order] = await db
    .insert(emiOrdersTable)
    .values({
      shopId: body.shopId,
      productId: body.productId ?? null,
      productName: body.productName,
      totalPrice: String(body.totalPrice),
      discount: String(discount),
      downPayment: String(body.downPayment),
      emiMonths: body.emiMonths,
      monthlyAmount: String(monthlyAmount),
      dueDayOfMonth: body.dueDayOfMonth ?? null,
      purchaseDate: body.purchaseDate,
      status: "active",
    })
    .returning();

  const [shop] = await db.select().from(shopsTable).where(eq(shopsTable.id, order.shopId));

  res.status(201).json(
    formatOrder(
      { ...order, shopName: shop?.name ?? null } as Record<string, unknown>,
      0,
      0
    )
  );
});

router.get("/emi-orders/:id", async (req, res) => {
  const { id } = GetEmiOrderParams.parse({ id: Number(req.params.id) });

  const [order] = await db
    .select({
      id: emiOrdersTable.id,
      shopId: emiOrdersTable.shopId,
      productId: emiOrdersTable.productId,
      productName: emiOrdersTable.productName,
      totalPrice: emiOrdersTable.totalPrice,
      discount: emiOrdersTable.discount,
      downPayment: emiOrdersTable.downPayment,
      emiMonths: emiOrdersTable.emiMonths,
      monthlyAmount: emiOrdersTable.monthlyAmount,
      dueDayOfMonth: emiOrdersTable.dueDayOfMonth,
      status: emiOrdersTable.status,
      purchaseDate: emiOrdersTable.purchaseDate,
      shopName: shopsTable.name,
    })
    .from(emiOrdersTable)
    .leftJoin(shopsTable, eq(emiOrdersTable.shopId, shopsTable.id))
    .where(eq(emiOrdersTable.id, id));

  if (!order) {
    res.status(404).json({ error: "EMI order not found" });
    return;
  }

  const payments = await db
    .select()
    .from(emiPaymentsTable)
    .where(eq(emiPaymentsTable.emiOrderId, id))
    .orderBy(emiPaymentsTable.paymentDate);

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const installmentsPaid = payments.length;

  const formattedOrder = formatOrder(order as Record<string, unknown>, totalPaid, installmentsPaid);

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

  // If price/down payment/months changed, recalculate monthlyAmount
  if (
    (body.totalPrice !== undefined || body.downPayment !== undefined || body.emiMonths !== undefined) &&
    body.monthlyAmount === undefined
  ) {
    const [existing] = await db.select().from(emiOrdersTable).where(eq(emiOrdersTable.id, id));
    if (existing) {
      const totalPrice = body.totalPrice ?? Number(existing.totalPrice);
      const downPayment = body.downPayment ?? Number(existing.downPayment);
      const emiMonths = body.emiMonths ?? existing.emiMonths;
      const emiTotal = totalPrice - downPayment;
      updateData.monthlyAmount = String(emiMonths > 0 ? Math.ceil(emiTotal / emiMonths) : 0);
    }
  }

  const [order] = await db
    .update(emiOrdersTable)
    .set(updateData)
    .where(eq(emiOrdersTable.id, id))
    .returning();
  if (!order) {
    res.status(404).json({ error: "EMI order not found" });
    return;
  }

  const stats = await db
    .select({
      total: sql<string>`COALESCE(SUM(${emiPaymentsTable.amount}), 0)`,
      count: sql<string>`COUNT(*)`,
    })
    .from(emiPaymentsTable)
    .where(eq(emiPaymentsTable.emiOrderId, id));

  const totalPaid = Number(stats[0]?.total ?? 0);
  const installmentsPaid = Number(stats[0]?.count ?? 0);
  res.json(formatOrder(order as Record<string, unknown>, totalPaid, installmentsPaid));
});

router.delete("/emi-orders/:id", async (req, res) => {
  const { id } = DeleteEmiOrderParams.parse({ id: Number(req.params.id) });
  await db.delete(emiPaymentsTable).where(eq(emiPaymentsTable.emiOrderId, id));
  await db.delete(emiOrdersTable).where(eq(emiOrdersTable.id, id));
  res.status(204).send();
});

router.get("/emi-orders/:id/payments", async (req, res) => {
  const { id } = ListEmiPaymentsParams.parse({ id: Number(req.params.id) });
  const payments = await db
    .select()
    .from(emiPaymentsTable)
    .where(eq(emiPaymentsTable.emiOrderId, id))
    .orderBy(emiPaymentsTable.paymentDate);

  res.json(
    payments.map((p) => ({
      ...p,
      amount: Number(p.amount),
      createdAt: p.createdAt.toISOString(),
    }))
  );
});

router.post("/emi-orders/:id/payments", async (req, res) => {
  const { id } = CreateEmiPaymentParams.parse({ id: Number(req.params.id) });
  const body = CreateEmiPaymentBody.parse(req.body);

  const [payment] = await db
    .insert(emiPaymentsTable)
    .values({
      emiOrderId: id,
      amount: String(body.amount),
      paymentDate: body.paymentDate,
      paymentMethod: body.paymentMethod,
      notes: body.notes ?? null,
    })
    .returning();

  const [order] = await db.select().from(emiOrdersTable).where(eq(emiOrdersTable.id, id));
  if (order) {
    const totals = await db
      .select({
        total: sql<string>`COALESCE(SUM(${emiPaymentsTable.amount}), 0)`,
      })
      .from(emiPaymentsTable)
      .where(eq(emiPaymentsTable.emiOrderId, id));
    const totalPaid = Number(totals[0]?.total ?? 0);
    const emiTotal = Number(order.totalPrice) - Number(order.downPayment);
    if (totalPaid >= emiTotal && order.status !== "completed") {
      await db.update(emiOrdersTable).set({ status: "completed" }).where(eq(emiOrdersTable.id, id));
    }
  }

  res.status(201).json({
    ...payment,
    amount: Number(payment.amount),
    createdAt: payment.createdAt.toISOString(),
  });
});

router.delete("/payments/:paymentId", async (req, res) => {
  const { paymentId } = DeleteEmiPaymentParams.parse({ paymentId: Number(req.params.paymentId) });
  await db.delete(emiPaymentsTable).where(eq(emiPaymentsTable.id, paymentId));
  res.status(204).send();
});

export default router;
