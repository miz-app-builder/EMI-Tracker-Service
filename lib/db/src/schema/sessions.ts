import { pgTable, uuid, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const sessionsTable = pgTable("sessions", {
  id:          uuid("id").primaryKey().defaultRandom(),
  userId:      uuid("user_id").notNull(),
  deviceInfo:  text("device_info"),
  ipAddress:   text("ip_address"),
  createdAt:   timestamp("created_at",   { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt:  timestamp("last_used_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt:   timestamp("expires_at",   { withTimezone: true }).notNull(),
  isRevoked:   boolean("is_revoked").notNull().default(false),
});

export type Session = typeof sessionsTable.$inferSelect;
