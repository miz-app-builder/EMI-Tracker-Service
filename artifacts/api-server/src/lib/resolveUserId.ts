import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export async function resolveUserId(clerkId: string): Promise<string | null> {
  const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.clerkId, clerkId));
  return user?.id ?? null;
}
