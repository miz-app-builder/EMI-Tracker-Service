---
name: DB Migration Pattern
description: drizzle-kit push requires TTY for destructive column changes; use inline node script with pg client instead.
---

## Problem
`drizzle-kit push --force` still prompts interactively for destructive changes (column drops) even with `--force` flag, requiring a TTY. Fails in CI/non-TTY with: "Interactive prompts require a TTY terminal".

## Solution
Run raw SQL directly using a node --input-type=module inline script with the pg client:

```js
import('/home/runner/workspace/node_modules/.pnpm/pg@8.20.0/node_modules/pg/lib/index.js').then(async (pg) => {
  const { Client } = pg.default;
  const client = new Client({
    connectionString: process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL,
    ssl: process.env.SUPABASE_DATABASE_URL ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();
  // run ALTER TABLE etc.
  await client.end();
});
```

**Why:** The workspace root doesn't have pg directly importable; must use the .pnpm path. SUPABASE_DATABASE_URL requires ssl with rejectUnauthorized: false.

**How to apply:** Use this pattern whenever drizzle-kit push fails due to TTY requirement (destructive schema changes).
