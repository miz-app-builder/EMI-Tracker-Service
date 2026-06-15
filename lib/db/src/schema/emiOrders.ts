import { pgTable, text, serial, integer, numeric, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { shopsTable } from "./shops";
import { productsTable } from "./products";

export const emiOrdersTable = pgTable("emi_orders", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  shopId: integer("shop_id").notNull().references(() => shopsTable.id),
  productId: integer("product_id").references(() => productsTable.id),
  productName: text("product_name").notNull(),
  totalPrice: numeric("total_price", { precision: 12, scale: 2 }).notNull(),
  discount: numeric("discount", { precision: 12, scale: 2 }).notNull().default("0"),
  downPayment: numeric("down_payment", { precision: 12, scale: 2 }).notNull().default("0"),
  emiMonths: integer("emi_months").notNull(),
  monthlyAmount: numeric("monthly_amount", { precision: 12, scale: 2 }).notNull(),
  dueDayOfMonth: integer("due_day_of_month"),
  status: text("status").notNull().default("active"),
  purchaseDate: date("purchase_date", { mode: "string" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEmiOrderSchema = createInsertSchema(emiOrdersTable).omit({ id: true, createdAt: true });
export type InsertEmiOrder = z.infer<typeof insertEmiOrderSchema>;
export type EmiOrder = typeof emiOrdersTable.$inferSelect;
