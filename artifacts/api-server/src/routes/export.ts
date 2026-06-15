import { Router } from "express";
import { db, emiOrdersTable, emiPaymentsTable, shopsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { resolveUserId } from "../lib/resolveUserId";

const router = Router();

router.post("/import", async (req, res) => {
  const userId = await resolveUserId((req as any).userId);
  if (!userId) { res.status(401).json({ error: "User not found" }); return; }

  const { shops = [], emiOrders = [], payments = [] } = req.body ?? {};

  if (!Array.isArray(shops) || !Array.isArray(emiOrders) || !Array.isArray(payments)) {
    res.status(400).json({ error: "Invalid import format. Expected { shops, emiOrders, payments } arrays." });
    return;
  }

  // 1. Import shops — map old ID → new ID
  const shopIdMap = new Map<number, number>();
  let shopsImported = 0;
  for (const s of shops) {
    if (!s.name) continue;
    const [created] = await db.insert(shopsTable).values({
      userId,
      name: String(s.name),
      ...(s.description ? { branch: String(s.description) } : {}),
    }).returning({ id: shopsTable.id });
    if (created) {
      shopIdMap.set(Number(s.id), created.id);
      shopsImported++;
    }
  }

  // 2. Import EMI orders — resolve shopId from shopName or shopIdMap
  const orderIdMap = new Map<number, number>();
  let ordersImported = 0;
  for (const o of emiOrders) {
    if (!o.productName || !o.purchaseDate) continue;

    // Find shopId: prefer mapped id, fall back to name lookup
    let newShopId: number | null = shopIdMap.get(Number(o.shopId)) ?? null;
    if (!newShopId && o.shopName) {
      const existing = await db
        .select({ id: shopsTable.id })
        .from(shopsTable)
        .where(eq(shopsTable.userId, userId))
        .limit(50);
      const match = existing.find((r) => {
        const name = (o.shopName as string).trim().toLowerCase();
        return (r as any).name?.toLowerCase() === name;
      });
      if (match) newShopId = match.id;
    }
    if (!newShopId) continue; // can't import order without a valid shop

    const [created] = await db.insert(emiOrdersTable).values({
      userId,
      shopId: newShopId,
      productName: String(o.productName),
      totalPrice: String(Number(o.totalPrice) || 0),
      discount: String(Number(o.discount) || 0),
      downPayment: String(Number(o.downPayment) || 0),
      emiMonths: Number(o.emiMonths) || 1,
      monthlyAmount: String(Number(o.monthlyAmount) || 0),
      status: o.status === "completed" ? "completed" : "active",
      purchaseDate: String(o.purchaseDate),
      ...(o.dueDayOfMonth ? { dueDayOfMonth: Number(o.dueDayOfMonth) } : {}),
      ...(o.modelNumber ? { modelNumber: String(o.modelNumber) } : {}),
      ...(o.warrantyInfo ? { warrantyInfo: String(o.warrantyInfo) } : {}),
    }).returning({ id: emiOrdersTable.id });
    if (created) {
      orderIdMap.set(Number(o.id), created.id);
      ordersImported++;
    }
  }

  // 3. Import payments — map old emiOrderId → new emiOrderId
  let paymentsImported = 0;
  for (const p of payments) {
    if (!p.amount || !p.paymentDate || !p.paymentMethod) continue;
    const newOrderId = orderIdMap.get(Number(p.emiOrderId));
    if (!newOrderId) continue;
    await db.insert(emiPaymentsTable).values({
      emiOrderId: newOrderId,
      amount: String(Number(p.amount) || 0),
      paymentDate: String(p.paymentDate),
      paymentMethod: String(p.paymentMethod),
      ...(p.bankName ? { bankName: String(p.bankName) } : {}),
      ...(p.accountNumber ? { accountNumber: String(p.accountNumber) } : {}),
      ...(p.transactionId ? { transactionId: String(p.transactionId) } : {}),
      ...(p.notes ? { notes: String(p.notes) } : {}),
    });
    paymentsImported++;
  }

  res.json({ shops: shopsImported, emiOrders: ordersImported, payments: paymentsImported });
});

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
