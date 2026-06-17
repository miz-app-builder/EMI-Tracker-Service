import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db, usersTable, sessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logActivity } from "../lib/logActivity";

const router = Router();
const COOKIE_NAME = "emi_token";

function cookieOpts() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    secure: process.env.NODE_ENV === "production",
  };
}

function getDeviceInfo(req: any): string {
  const ua = req.headers["user-agent"] ?? "Unknown";
  return ua.slice(0, 200);
}

function getIp(req: any): string {
  return (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "Unknown"
  );
}

function extractTokenFromReq(req: any): string | null {
  const authHeader = req.headers["authorization"];
  if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7);
  return req.cookies?.[COOKIE_NAME] ?? null;
}

async function createSession(userId: string, req: any): Promise<string> {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const [session] = await db
    .insert(sessionsTable)
    .values({
      userId,
      deviceInfo: getDeviceInfo(req),
      ipAddress: getIp(req),
      expiresAt,
    })
    .returning({ id: sessionsTable.id });
  return session.id;
}

router.post("/auth/signup", async (req, res) => {
  const secret = process.env.SESSION_SECRET;
  if (!secret) { res.status(500).json({ error: "Server misconfigured" }); return; }

  const { email, password, name, phone, address } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "email and password required" });
    return;
  }

  const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
  if (existing.length > 0) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db
    .insert(usersTable)
    .values({
      email: email.toLowerCase(),
      passwordHash,
      name: name ?? null,
      phone: phone ?? null,
      address: address ?? null,
      lastActiveAt: new Date(),
    })
    .returning();

  const sessionId = await createSession(user.id, req);
  const token = jwt.sign({ userId: user.id, email: user.email, sessionId }, secret, { expiresIn: "7d" });
  res.cookie(COOKIE_NAME, token, cookieOpts());
  logActivity(user.id, "signup", "Account created");
  res.status(201).json({ id: user.id, email: user.email, name: user.name, token });
});

router.post("/auth/login", async (req, res) => {
  const secret = process.env.SESSION_SECRET;
  if (!secret) { res.status(500).json({ error: "Server misconfigured" }); return; }

  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "email and password required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  await db.update(usersTable).set({ lastActiveAt: new Date() }).where(eq(usersTable.email, email.toLowerCase()));
  const sessionId = await createSession(user.id, req);
  const token = jwt.sign({ userId: user.id, email: user.email, sessionId }, secret, { expiresIn: "7d" });
  res.cookie(COOKIE_NAME, token, cookieOpts());
  logActivity(user.id, "login", "Logged in");
  res.json({ id: user.id, email: user.email, name: user.name, token });
});

router.post("/auth/logout", async (req, res) => {
  const secret = process.env.SESSION_SECRET;
  if (secret) {
    try {
      const token = extractTokenFromReq(req);
      if (token) {
        const payload = jwt.verify(token, secret) as { userId: string; sessionId?: string };
        logActivity(payload.userId, "logout", "Logged out");
        if (payload.sessionId) {
          await db
            .update(sessionsTable)
            .set({ isRevoked: true })
            .where(eq(sessionsTable.id, payload.sessionId));
        }
      }
    } catch {}
  }
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
});

router.get("/auth/me", async (req, res) => {
  const secret = process.env.SESSION_SECRET;
  if (!secret) { res.status(500).json({ error: "Server misconfigured" }); return; }

  const token = extractTokenFromReq(req);
  if (!token) { res.status(401).json({ error: "Not authenticated" }); return; }

  try {
    const payload = jwt.verify(token, secret) as { userId: string; email: string };
    const [user] = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        name: usersTable.name,
        phone: usersTable.phone,
        address: usersTable.address,
        profilePhotoUrl: usersTable.profilePhotoUrl,
        emailVerifiedAt: usersTable.emailVerifiedAt,
        passwordChangedAt: usersTable.passwordChangedAt,
        lastActiveAt: usersTable.lastActiveAt,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .where(eq(usersTable.id, payload.userId));
    if (!user) { res.status(401).json({ error: "User not found" }); return; }
    res.json(user);
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

export default router;
