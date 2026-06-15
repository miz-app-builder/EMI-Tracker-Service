import { Router } from "express";
import { db, emiOrdersTable, emiPaymentsTable, shopsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { resolveUserId } from "../lib/resolveUserId";

const router = Router();

router.get("/dashboard/summary", async (req, res) => {
  const userId = await resolveUserId((req as any).userId);
  if (!userId) { res.status(401).json({ error: "User not found" }); return; }

  const orders = await db
    .select({
      id: emiOrdersTable.id,
      totalPrice: emiOrdersTable.totalPrice,
      discount: emiOrdersTable.discount,
      downPayment: emiOrdersTable.downPayment,
      emiMonths: emiOrdersTable.emiMonths,
      monthlyAmount: emiOrdersTable.monthlyAmount,
      status: emiOrdersTable.status,
      purchaseDate: emiOrdersTable.purchaseDate,
    })
    .from(emiOrdersTable)
    .where(eq(emiOrdersTable.userId, userId));

  const paymentStats = await db
    .select({
      emiOrderId: emiPaymentsTable.emiOrderId,
      total: sql<string>`COALESCE(SUM(${emiPaymentsTable.amount}), 0)`,
      count: sql<string>`COUNT(*)`,
    })
    .from(emiPaymentsTable)
    .groupBy(emiPaymentsTable.emiOrderId);

  const paidMap: Record<number, number> = {};
  const countMap: Record<number, number> = {};
  paymentStats.forEach((p) => {
    paidMap[p.emiOrderId] = Number(p.total);
    countMap[p.emiOrderId] = Number(p.count);
  });

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const monthEndStr = `${monthEnd.getFullYear()}-${String(monthEnd.getMonth() + 1).padStart(2, "0")}-${String(monthEnd.getDate()).padStart(2, "0")}`;

  const orderIds = orders.map((o) => o.id);
  let thisMonthCollected = 0;
  if (orderIds.length > 0) {
    const thisMonthPayments = await db
      .select({ total: sql<string>`COALESCE(SUM(${emiPaymentsTable.amount}), 0)` })
      .from(emiPaymentsTable)
      .where(sql`${emiPaymentsTable.emiOrderId} = ANY(ARRAY[${sql.raw(orderIds.join(","))}]::int[]) AND ${emiPaymentsTable.paymentDate} >= ${monthStart} AND ${emiPaymentsTable.paymentDate} <= ${monthEndStr}`);
    thisMonthCollected = Number(thisMonthPayments[0]?.total ?? 0);
  }

  let totalActiveOrders = 0;
  let totalCompletedOrders = 0;
  let totalDueAmount = 0;
  let totalPaidAmount = 0;
  let overdueOrders = 0;
  let nextPaymentDate: string | null = null;

  for (const order of orders) {
    const totalPaid = paidMap[order.id] ?? 0;
    const installmentsPaid = countMap[order.id] ?? 0;
    const discount = Number(order.discount ?? 0);
    const emiTotal = Number(order.totalPrice) - discount - Number(order.downPayment);
    const remaining = Math.max(0, emiTotal - totalPaid);
    totalPaidAmount += totalPaid;

    if (order.status === "active") {
      totalActiveOrders++;
      totalDueAmount += remaining;
      const purchaseDate = new Date(order.purchaseDate);
      const planEndDate = new Date(purchaseDate);
      planEndDate.setMonth(planEndDate.getMonth() + order.emiMonths);
      if (planEndDate < now && remaining > 0) overdueOrders++;
      if (installmentsPaid < order.emiMonths) {
        const nd = new Date(order.purchaseDate);
        nd.setMonth(nd.getMonth() + installmentsPaid + 1);
        const ndStr = nd.toISOString().split("T")[0];
        if (!nextPaymentDate || ndStr < nextPaymentDate) nextPaymentDate = ndStr;
      }
    } else {
      totalCompletedOrders++;
    }
  }

  res.json({
    totalActiveOrders,
    totalCompletedOrders,
    totalOrders: orders.length,
    totalDueAmount,
    totalPaidAmount,
    overdueOrders,
    thisMonthCollected,
    nextPaymentDate,
  });
});

router.get("/dashboard/due-this-month", async (req, res) => {
  const userId = await resolveUserId((req as any).userId);
  if (!userId) { res.status(401).json({ error: "User not found" }); return; }
  const now = new Date();

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
      status: emiOrdersTable.status,
      purchaseDate: emiOrdersTable.purchaseDate,
      shopName: shopsTable.name,
    })
    .from(emiOrdersTable)
    .leftJoin(shopsTable, eq(emiOrdersTable.shopId, shopsTable.id))
    .where(sql`${emiOrdersTable.userId} = ${userId} AND ${emiOrdersTable.status} = 'active'`);

  const paymentStats = await db
    .select({
      emiOrderId: emiPaymentsTable.emiOrderId,
      total: sql<string>`COALESCE(SUM(${emiPaymentsTable.amount}), 0)`,
      count: sql<string>`COUNT(*)`,
    })
    .from(emiPaymentsTable)
    .groupBy(emiPaymentsTable.emiOrderId);

  const paidMap: Record<number, number> = {};
  const countMap: Record<number, number> = {};
  paymentStats.forEach((p) => {
    paidMap[p.emiOrderId] = Number(p.total);
    countMap[p.emiOrderId] = Number(p.count);
  });

  const dueOrders = rows.filter((order) => {
    const purchaseDate = new Date(order.purchaseDate);
    const monthsPassed =
      (now.getFullYear() - purchaseDate.getFullYear()) * 12 +
      (now.getMonth() - purchaseDate.getMonth());
    return monthsPassed >= 0 && monthsPassed < order.emiMonths;
  });

  res.json(
    dueOrders.map((order) => {
      const totalPaid = paidMap[order.id] ?? 0;
      const installmentsPaid = countMap[order.id] ?? 0;
      const discount = Number(order.discount ?? 0);
      const emiTotal = Number(order.totalPrice) - discount - Number(order.downPayment);
      const remaining = Math.max(0, emiTotal - totalPaid);
      const nd = new Date(order.purchaseDate);
      nd.setMonth(nd.getMonth() + installmentsPaid + 1);
      const nextDueDate = installmentsPaid >= order.emiMonths ? null : nd.toISOString().split("T")[0];
      return {
        ...order,
        totalPrice: Number(order.totalPrice),
        discount,
        downPayment: Number(order.downPayment),
        monthlyAmount: Number(order.monthlyAmount),
        totalPaid,
        remainingAmount: remaining,
        installmentsPaid,
        nextDueDate,
      };
    })
  );
});

router.get("/dashboard/shop-stats", async (req, res) => {
  const userId = await resolveUserId((req as any).userId);
  if (!userId) { res.status(401).json({ error: "User not found" }); return; }

  const shops = await db.select().from(shopsTable).where(eq(shopsTable.userId, userId));
  const orders = await db
    .select({ id: emiOrdersTable.id, shopId: emiOrdersTable.shopId, totalPrice: emiOrdersTable.totalPrice, downPayment: emiOrdersTable.downPayment })
    .from(emiOrdersTable)
    .where(eq(emiOrdersTable.userId, userId));

  const paymentTotals = await db
    .select({ emiOrderId: emiPaymentsTable.emiOrderId, total: sql<string>`COALESCE(SUM(${emiPaymentsTable.amount}), 0)` })
    .from(emiPaymentsTable)
    .groupBy(emiPaymentsTable.emiOrderId);

  const paidMap: Record<number, number> = {};
  paymentTotals.forEach((p) => { paidMap[p.emiOrderId] = Number(p.total); });

  res.json(shops.map((shop) => {
    const shopOrders = orders.filter((o) => o.shopId === shop.id);
    let totalDue = 0;
    let totalPaid = 0;
    for (const order of shopOrders) {
      const paid = paidMap[order.id] ?? 0;
      const emiTotal = Number(order.totalPrice) - Number(order.downPayment);
      totalDue += Math.max(0, emiTotal - paid);
      totalPaid += paid;
    }
    return { shopId: shop.id, shopName: shop.name, totalOrders: shopOrders.length, totalDue, totalPaid };
  }));
});

export default router;
