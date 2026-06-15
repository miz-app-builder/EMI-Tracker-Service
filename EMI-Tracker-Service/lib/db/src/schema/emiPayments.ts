import { pgTable, text, serial, integer, numeric, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { emiOrdersTable } from "./emiOrders";

export const emiPaymentsTable = pgTable("emi_payments", {
  id: serial("id").primaryKey(),
  emiOrderId: integer("emi_order_id").notNull().references(() => emiOrdersTable.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  paymentDate: date("payment_date", { mode: "string" }).notNull(),
  paymentMethod: text("payment_method").notNull(),
  bankName: text("bank_name"),
  accountNumber: text("account_number"),
  transactionId: text("transaction_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEmiPaymentSchema = createInsertSchema(emiPaymentsTable).omit({ id: true, createdAt: true });
export type InsertEmiPayment = z.infer<typeof insertEmiPaymentSchema>;
export type EmiPayment = typeof emiPaymentsTable.$inferSelect;
