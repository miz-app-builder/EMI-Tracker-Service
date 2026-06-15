import { pgTable, text, serial, uuid, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const shopsTable = pgTable("shops", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => usersTable.id),
  name: text("name").notNull(),
  branch: text("branch"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  website: text("website"),
  contactPerson: text("contact_person"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertShopSchema = createInsertSchema(shopsTable).omit({ id: true, createdAt: true });
export type InsertShop = z.infer<typeof insertShopSchema>;
export type Shop = typeof shopsTable.$inferSelect;
