import { pgTable, text, uuid, timestamp } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  pinHash: text("pin_hash"),
  name: text("name"),
  phone: text("phone"),
  address: text("address"),
  profilePhotoUrl: text("profile_photo_url"),
  themePreference: text("theme_preference"),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  passwordChangedAt: timestamp("password_changed_at", { withTimezone: true }),
  lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof usersTable.$inferSelect;
