export async function resolveUserId(userId: string): Promise<string | null> {
  return userId ?? null;
}
