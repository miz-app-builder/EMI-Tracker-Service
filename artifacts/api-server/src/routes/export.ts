import { Router } from "express";
import { db, emiOrdersTable, emiPaymentsTable, shopsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { resolveUserId } from "../lib/resolveUserId";

const router = Router();

router.get("/export", async (req, res) => {
  const userId = await resolveUserId((req as any).userId);
  if (!userId) { res.status(401).json({ error: "User not found" }); return; }

  const shops = await db
    .select()
    .from(shopsTable)
    .where(eq(shopsTable.userId, userId));

  const orders = await db
    .select({
      id: emiOrdersTable.id,
      productName: emiOrdersTable.productName,
      shopName: shopsTable.name,
      totalPrice: emiOrdersTable.totalPrice,
      discount: emiOrdersTable.discount,
      downPayment: emiOrdersTable.downPayment,
      emiMonths: emiOrdersTable.emiMonths,
      monthlyAmount: emiOrdersTable.monthlyAmount,
      dueDayOfMonth: emiOrdersTable.dueDayOfMonth,
      modelNumber: emiOrdersTable.modelNumber,
      warrantyInfo: emiOrdersTable.warrantyInfo,
      status: emiOrdersTable.status,
      purchaseDate: emiOrdersTable.purchaseDate,
    })
    .from(emiOrdersTable)
    .leftJoin(shopsTable, eq(emiOrdersTable.shopId, shopsTable.id))
    .where(eq(emiOrdersTable.userId, userId));

  const orderIds = orders.map((o) => o.id);
  let payments: unknown[] = [];
  if (orderIds.length > 0) {
    payments = await db
      .select({
        id: emiPaymentsTable.id,
        emiOrderId: emiPaymentsTable.emiOrderId,
        amount: emiPaymentsTable.amount,
        paymentDate: emiPaymentsTable.paymentDate,
        paymentMethod: emiPaymentsTable.paymentMethod,
        bankName: emiPaymentsTable.bankName,
        accountNumber: emiPaymentsTable.accountNumber,
        transactionId: emiPaymentsTable.transactionId,
        notes: emiPaymentsTable.notes,
        createdAt: emiPaymentsTable.createdAt,
      })
      .from(emiPaymentsTable)
      .where(sql`${emiPaymentsTable.emiOrderId} = ANY(ARRAY[${sql.raw(orderIds.join(","))}]::int[])`);
  }

  res.json({
    exportedAt: new Date().toISOString(),
    shops: shops.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description ?? "",
      createdAt: s.createdAt?.toISOString() ?? "",
    })),
    emiOrders: orders.map((o) => ({
      id: o.id,
      productName: o.productName,
      shopName: o.shopName ?? "",
      totalPrice: Number(o.totalPrice),
      discount: Number(o.discount ?? 0),
      downPayment: Number(o.downPayment),
      emiMonths: o.emiMonths,
      monthlyAmount: Number(o.monthlyAmount),
      dueDayOfMonth: o.dueDayOfMonth ?? "",
      modelNumber: o.modelNumber ?? "",
      warrantyInfo: o.warrantyInfo ?? "",
      status: o.status,
      purchaseDate: o.purchaseDate,
    })),
    payments: (payments as any[]).map((p) => ({
      id: p.id,
      emiOrderId: p.emiOrderId,
      amount: Number(p.amount),
      paymentDate: p.paymentDate,
      paymentMethod: p.paymentMethod,
      bankName: p.bankName ?? "",
      accountNumber: p.accountNumber ?? "",
      transactionId: p.transactionId ?? "",
      notes: p.notes ?? "",
      createdAt: p.createdAt?.toISOString() ?? "",
    })),
  });
});

export default router;
