import { Router } from "express";
import { db, emiOrdersTable, emiPaymentsTable, shopsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { resolveUserId } from "../lib/resolveUserId";

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
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    date.setDate(Math.min(dueDayOfMonth, lastDay));
  }
  return date.toISOString().split("T")[0];
}

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
      dueDayOfMonth: emiOrdersTable.dueDayOfMonth,
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
    const downPayment = Number(order.downPayment);
    const emiTotal = Number(order.totalPrice) - discount - downPayment;
    const remaining = Math.max(0, emiTotal - totalPaid);

    // FIX 3: Total Paid includes down payment + all installments paid
    totalPaidAmount += totalPaid + downPayment;

    if (order.status === "active") {
      totalActiveOrders++;
      totalDueAmount += remaining;

      const purchaseDate = new Date(order.purchaseDate);
      const planEndDate = new Date(purchaseDate);
      planEndDate.setMonth(planEndDate.getMonth() + order.emiMonths);
      if (planEndDate < now && remaining > 0) overdueOrders++;

      // FIX 1: Use calcNextDueDate with dueDayOfMonth for accurate next payment date
      if (installmentsPaid < order.emiMonths) {
        const ndStr = calcNextDueDate(
          order.purchaseDate,
          order.emiMonths,
          installmentsPaid,
          order.dueDayOfMonth,
        );
        if (ndStr && (!nextPaymentDate || ndStr < nextPaymentDate)) nextPaymentDate = ndStr;
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
      dueDayOfMonth: emiOrdersTable.dueDayOfMonth,
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

  // End of current month
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  endOfMonth.setHours(23, 59, 59, 999);

  // FIX 2: Only include orders where the next due date is on or before end of this month
  // (i.e., this month's installment has NOT been paid yet, or is overdue from a past month)
  const result = rows
    .map((order) => {
      const totalPaid = paidMap[order.id] ?? 0;
      const installmentsPaid = countMap[order.id] ?? 0;
      const discount = Number(order.discount ?? 0);
      const downPayment = Number(order.downPayment);
      const emiTotal = Number(order.totalPrice) - discount - downPayment;
      const remaining = Math.max(0, emiTotal - totalPaid);
      const remainingMonths = Math.max(0, order.emiMonths - installmentsPaid);
      const nextMonthlyAmount = remainingMonths > 0 ? Math.ceil(remaining / remainingMonths) : 0;
      const nextDueDate = calcNextDueDate(
        order.purchaseDate,
        order.emiMonths,
        installmentsPaid,
        order.dueDayOfMonth,
      );
      return {
        ...order,
        totalPrice: Number(order.totalPrice),
        discount,
        downPayment,
        monthlyAmount: Number(order.monthlyAmount),
        nextMonthlyAmount,
        totalPaid,
        remainingAmount: remaining,
        installmentsPaid,
        nextDueDate,
      };
    })
    .filter((order) => {
      // Must have a pending due date and it must be <= end of this month
      if (!order.nextDueDate) return false;
      const dueDateObj = new Date(order.nextDueDate);
      return dueDateObj <= endOfMonth;
    });

  res.json(result);
});

router.get("/dashboard/shop-stats", async (req, res) => {
  const userId = await resolveUserId((req as any).userId);
  if (!userId) { res.status(401).json({ error: "User not found" }); return; }

  const shops = await db.select().from(shopsTable).where(eq(shopsTable.userId, userId));
  const orders = await db
    .select({ id: emiOrdersTable.id, shopId: emiOrdersTable.shopId, totalPrice: emiOrdersTable.totalPrice, discount: emiOrdersTable.discount, downPayment: emiOrdersTable.downPayment })
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
      const discount = Number(order.discount ?? 0);
      const downPayment = Number(order.downPayment);
      const emiTotal = Number(order.totalPrice) - discount - downPayment;
      totalDue += Math.max(0, emiTotal - paid);
      totalPaid += paid + downPayment;
    }
    return { shopId: shop.id, shopName: shop.name, totalOrders: shopOrders.length, totalDue, totalPaid };
  }));
});

export default router;
