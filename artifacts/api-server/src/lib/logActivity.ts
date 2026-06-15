import { db, activityLogsTable } from "@workspace/db";

export async function logActivity(
  userId: string,
  action: string,
  description?: string,
  metadata?: Record<string, unknown>,
) {
  try {
    await db.insert(activityLogsTable).values({
      userId,
      action,
      description: description ?? null,
      metadata: metadata ? JSON.stringify(metadata) : null,
    });
  } catch {
    // non-critical — never throw
  }
}
