import { Router } from "express";
import { db, emiOrdersTable, emiPaymentsTable, shopsTable, customersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();

router.get("/dashboard/summary", async (req, res) => {
  const orders = await db
    .select({
      id: emiOrdersTable.id,
      totalPrice: emiOrdersTable.totalPrice,
      downPayment: emiOrdersTable.downPayment,
      emiMonths: emiOrdersTable.emiMonths,
      monthlyAmount: emiOrdersTable.monthlyAmount,
      status: emiOrdersTable.status,
      purchaseDate: emiOrdersTable.purchaseDate,
    })
    .from(emiOrdersTable);

  const paymentTotals = await db
    .select({
      emiOrderId: emiPaymentsTable.emiOrderId,
      total: sql<string>`COALESCE(SUM(${emiPaymentsTable.amount}), 0)`,
    })
    .from(emiPaymentsTable)
    .groupBy(emiPaymentsTable.emiOrderId);

  const paidMap: Record<number, number> = {};
  paymentTotals.forEach((p) => { paidMap[p.emiOrderId] = Number(p.total); });

  // This month payments
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const monthEndStr = `${monthEnd.getFullYear()}-${String(monthEnd.getMonth() + 1).padStart(2, "0")}-${String(monthEnd.getDate()).padStart(2, "0")}`;

  const thisMonthPayments = await db
    .select({ total: sql<string>`COALESCE(SUM(${emiPaymentsTable.amount}), 0)` })
    .from(emiPaymentsTable)
    .where(sql`${emiPaymentsTable.paymentDate} >= ${monthStart} AND ${emiPaymentsTable.paymentDate} <= ${monthEndStr}`);

  let totalActiveOrders = 0;
  let totalCompletedOrders = 0;
  let totalDueAmount = 0;
  let totalPaidAmount = 0;
  let overdueOrders = 0;

  for (const order of orders) {
    const totalPaid = paidMap[order.id] ?? 0;
    const emiTotal = Number(order.totalPrice) - Number(order.downPayment);
    const remaining = Math.max(0, emiTotal - totalPaid);
    totalPaidAmount += totalPaid;

    if (order.status === "active") {
      totalActiveOrders++;
      totalDueAmount += remaining;
      // Check if overdue: purchase date + emi months < today
      const purchaseDate = new Date(order.purchaseDate);
      const dueDate = new Date(purchaseDate);
      dueDate.setMonth(dueDate.getMonth() + order.emiMonths);
      if (dueDate < now && remaining > 0) overdueOrders++;
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
    thisMonthCollected: Number(thisMonthPayments[0]?.total ?? 0),
  });
});

router.get("/dashboard/due-this-month", async (req, res) => {
  const now = new Date();

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
    .where(eq(emiOrdersTable.status, "active"));

  const paymentTotals = await db
    .select({
      emiOrderId: emiPaymentsTable.emiOrderId,
      total: sql<string>`COALESCE(SUM(${emiPaymentsTable.amount}), 0)`,
    })
    .from(emiPaymentsTable)
    .groupBy(emiPaymentsTable.emiOrderId);

  const paidMap: Record<number, number> = {};
  paymentTotals.forEach((p) => { paidMap[p.emiOrderId] = Number(p.total); });

  // Filter orders where the current month's installment is due
  const dueOrders = rows.filter((order) => {
    const purchaseDate = new Date(order.purchaseDate);
    const monthsPassed = (now.getFullYear() - purchaseDate.getFullYear()) * 12 + (now.getMonth() - purchaseDate.getMonth());
    return monthsPassed >= 0 && monthsPassed < order.emiMonths;
  });

  res.json(dueOrders.map((order) => {
    const totalPaid = paidMap[order.id] ?? 0;
    const emiTotal = Number(order.totalPrice) - Number(order.downPayment);
    const remaining = Math.max(0, emiTotal - totalPaid);
    return {
      ...order,
      totalPrice: Number(order.totalPrice),
      downPayment: Number(order.downPayment),
      monthlyAmount: Number(order.monthlyAmount),
      totalPaid,
      remainingAmount: remaining,
    };
  }));
});

router.get("/dashboard/shop-stats", async (req, res) => {
  const shops = await db.select().from(shopsTable);

  const orders = await db
    .select({
      id: emiOrdersTable.id,
      shopId: emiOrdersTable.shopId,
      totalPrice: emiOrdersTable.totalPrice,
      downPayment: emiOrdersTable.downPayment,
    })
    .from(emiOrdersTable);

  const paymentTotals = await db
    .select({
      emiOrderId: emiPaymentsTable.emiOrderId,
      total: sql<string>`COALESCE(SUM(${emiPaymentsTable.amount}), 0)`,
    })
    .from(emiPaymentsTable)
    .groupBy(emiPaymentsTable.emiOrderId);

  const paidMap: Record<number, number> = {};
  paymentTotals.forEach((p) => { paidMap[p.emiOrderId] = Number(p.total); });

  const stats = shops.map((shop) => {
    const shopOrders = orders.filter((o) => o.shopId === shop.id);
    let totalDue = 0;
    let totalPaid = 0;
    for (const order of shopOrders) {
      const paid = paidMap[order.id] ?? 0;
      const emiTotal = Number(order.totalPrice) - Number(order.downPayment);
      totalDue += Math.max(0, emiTotal - paid);
      totalPaid += paid;
    }
    return {
      shopId: shop.id,
      shopName: shop.name,
      totalOrders: shopOrders.length,
      totalDue,
      totalPaid,
    };
  });

  res.json(stats);
});

export default router;
